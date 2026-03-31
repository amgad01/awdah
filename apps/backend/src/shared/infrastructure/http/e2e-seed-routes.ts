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

import { createAwsClientConfig } from '../aws/client-config';

// Local user ID logic matching local-auth.service.ts
function localUserId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `local-${safe || 'dev-user'}`;
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
      // eslint-disable-next-line no-console
      console.error('[E2E Seed Error]:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}
