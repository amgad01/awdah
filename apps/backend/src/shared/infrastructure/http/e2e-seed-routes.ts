import express from 'express';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBUserRepository } from '../persistence/dynamodb-user.repository';
import { DynamoDBPracticingPeriodRepository } from '../persistence/dynamodb-practicing-period.repository';
import { DynamoDBPrayerLogRepository } from '../persistence/dynamodb-prayer-log.repository';
import { HijriDate } from '@awdah/shared';
import { PracticingPeriod } from '../../../contexts/shared/domain/entities/practicing-period.entity';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { PrayerName } from '../../../contexts/salah/domain/value-objects/prayer-name';
import {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import { settings } from '../../config/settings';
import { createLogger } from '../../middleware/logger';

import { createAwsClientConfig } from '../aws/client-config';

const logger = createLogger('E2ESeedRoutes');
const LOCALSTACK_GSI_PROJECTION = 'ALL' as const;

interface LocalE2eTableDefinition {
  tableName: string;
  pk: string;
  sk: string;
  gsi?: { name: string; pk: string; sk: string };
}

/**
 * LocalStack-only bootstrap for the Playwright seed route.
 *
 * Keep the key shapes aligned with the CDK tables in infra/lib/stacks/data-stack.ts.
 * This is intentionally limited to the keys/indexes the repositories need locally,
 * so CDK remains the production source of truth for billing, alarms, backups, and PITR.
 */
const LOCALSTACK_E2E_TABLES: LocalE2eTableDefinition[] = [
  {
    tableName: settings.tables.prayerLogs,
    pk: 'userId',
    sk: 'sk',
    gsi: { name: 'typeDateIndex', pk: 'userId', sk: 'typeDate' },
  },
  {
    tableName: settings.tables.fastLogs,
    pk: 'userId',
    sk: 'sk',
    gsi: { name: 'typeDateIndex', pk: 'userId', sk: 'typeDate' },
  },
  { tableName: settings.tables.practicingPeriods, pk: 'userId', sk: 'periodId' },
  { tableName: settings.tables.userSettings, pk: 'userId', sk: 'sk' },
  { tableName: settings.tables.userLifecycleJobs, pk: 'userId', sk: 'sk' },
  { tableName: settings.tables.deletedUsers, pk: 'userId', sk: 'deletedAt' },
];

// Local user ID logic matching local-auth.service.ts
function localUserId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const safe = normalized
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
  return `local-${safe || 'dev-user'}`;
}

async function ensureTable(client: DynamoDBClient, definition: LocalE2eTableDefinition) {
  const { tableName, pk, sk, gsi } = definition;

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
  } catch (error) {
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      const attributeDefinitions = Array.from(
        new Set([pk, sk, gsi?.pk, gsi?.sk].filter(Boolean)),
      ).map((attributeName) => ({
        AttributeName: attributeName,
        AttributeType: 'S' as const,
      }));

      try {
        await client.send(
          new CreateTableCommand({
            TableName: tableName,
            KeySchema: [
              { AttributeName: pk, KeyType: 'HASH' as const },
              { AttributeName: sk, KeyType: 'RANGE' as const },
            ],
            AttributeDefinitions: attributeDefinitions,
            BillingMode: 'PAY_PER_REQUEST' as const,
            GlobalSecondaryIndexes: gsi
              ? [
                  {
                    IndexName: gsi.name,
                    KeySchema: [
                      { AttributeName: gsi.pk, KeyType: 'HASH' as const },
                      { AttributeName: gsi.sk, KeyType: 'RANGE' as const },
                    ],
                    // The seed route reads full entities back via the index, so tests need all attributes.
                    Projection: { ProjectionType: LOCALSTACK_GSI_PROJECTION },
                  },
                ]
              : undefined,
          }),
        );
      } catch (createError) {
        if (!(createError instanceof Error && createError.name === 'ResourceInUseException')) {
          throw createError;
        }

        logger.debug(
          {
            tableName,
            err: createError,
          },
          'Table already exists during E2E bootstrap; continuing after parallel create race',
        );
      }
    } else {
      throw error;
    }
  }

  await waitUntilTableExists(
    {
      client,
      minDelay: 2,
      maxDelay: 5,
      maxWaitTime: 60,
    },
    { TableName: tableName },
  );
}

async function ensureAllTables(client: DynamoDBClient) {
  for (const table of LOCALSTACK_E2E_TABLES) {
    await ensureTable(client, table);
  }
}

export function registerE2eSeedRoutes(app: express.Express) {
  if (process.env.ENABLE_E2E_SEED !== 'true') {
    return;
  }

  const client = new DynamoDBClient(createAwsClientConfig());
  const docClient = DynamoDBDocumentClient.from(client);

  const userRepo = new DynamoDBUserRepository(docClient);
  const periodRepo = new DynamoDBPracticingPeriodRepository(docClient);
  const prayerRepo = new DynamoDBPrayerLogRepository(docClient);

  app.post('/v1/e2e/seed', async (req, res) => {
    try {
      // Ensure tables exist in local environment (LocalStack)
      await ensureAllTables(client);

      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Missing users array' });
      }

      for (const user of users) {
        const userId = localUserId(user.email);

        // 1. Seed User Settings
        await userRepo.save({
          userId,
          dateOfBirth: HijriDate.fromString('1425-01-01'),
          bulughDate: HijriDate.fromString('1440-01-01'),
          gender: 'male',
          madhab: 'shafii',
          calculationMethod: 'MWL',
        });

        // 2. Seed Practicing Period (started 1 year ago)
        const periodId = `period-${userId}`;
        await periodRepo.save(
          new PracticingPeriod({
            userId,
            periodId,
            startDate: HijriDate.fromString('1445-01-01'),
            type: 'both',
          }),
        );

        // 3. Seed some dummy logs if it's the tracker or history user
        if (user.email.includes('tracker') || user.email.includes('history')) {
          const today = HijriDate.today();
          const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

          for (const prayer of prayers) {
            await prayerRepo.save(
              new PrayerLog({
                userId,
                date: today,
                prayerName: new PrayerName(prayer),
                eventId: `seed-${prayer}`,
                type: new LogType('obligatory'),
                action: 'prayed',
                loggedAt: new Date(),
                isVoluntary: false,
              }),
            );
          }
        }
      }

      res.status(200).json({ status: 'seeded', count: users.length });
    } catch (error) {
      logger.error({ err: error }, 'E2E seed route failed');
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}
