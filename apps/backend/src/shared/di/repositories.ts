import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { settings } from '../config/settings';
import { UmAlQuraCalendarService } from '../infrastructure/services/umalqura-calendar.service';
import { SalahDebtCalculator } from '../../contexts/salah/domain/services/debt-calculator.service';
import { SawmDebtCalculator } from '../../contexts/sawm/domain/services/sawm-debt-calculator.service';
import { DynamoDBPrayerLogRepository } from '../infrastructure/persistence/dynamodb-prayer-log.repository';
import { DynamoDBFastLogRepository } from '../infrastructure/persistence/dynamodb-fast-log.repository';
import { DynamoDBPracticingPeriodRepository } from '../infrastructure/persistence/dynamodb-practicing-period.repository';
import { DynamoDBUserRepository } from '../infrastructure/persistence/dynamodb-user.repository';
import { DynamoDBUserDataLifecycleService } from '../infrastructure/persistence/dynamodb-user-data-lifecycle.service';
import { DynamoDBUserLifecycleJobRepository } from '../infrastructure/persistence/dynamodb-user-lifecycle-job.repository';
import { DynamoDBDeletedUsersRepository } from '../infrastructure/persistence/dynamodb-deleted-users.repository';
import { createAwsClientConfig } from '../infrastructure/aws/client-config';
import { UlidGenerator } from '../domain/services/ulid-generator';

// Shared Clients
const rawClient = new DynamoDBClient(createAwsClientConfig({ region: settings.region }));

export const dbClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// services
export const idGenerator = new UlidGenerator();
export const calendarService = new UmAlQuraCalendarService();
export const salahCalculator = new SalahDebtCalculator(calendarService);
export const sawmCalculator = new SawmDebtCalculator(calendarService);

// Repositories
export const prayerLogRepo = new DynamoDBPrayerLogRepository(dbClient);
export const fastLogRepo = new DynamoDBFastLogRepository(dbClient);
export const periodRepo = new DynamoDBPracticingPeriodRepository(dbClient);
export const userRepo = new DynamoDBUserRepository(dbClient);
export const userDataLifecycleService = new DynamoDBUserDataLifecycleService(dbClient);
export const userLifecycleJobRepo = new DynamoDBUserLifecycleJobRepository(dbClient);
export const deletedUsersRepo = new DynamoDBDeletedUsersRepository(dbClient);
