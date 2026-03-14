import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { UmAlQuraCalendarService } from '../infrastructure/services/umalqura-calendar.service';
import { SalahDebtCalculator } from '../../contexts/salah/domain/services/debt-calculator.service';
import { SawmDebtCalculator } from '../../contexts/sawm/domain/services/sawm-debt-calculator.service';
import { DynamoDBPrayerLogRepository } from '../infrastructure/persistence/dynamodb-prayer-log.repository';
import { DynamoDBFastLogRepository } from '../infrastructure/persistence/dynamodb-fast-log.repository';
import { DynamoDBPracticingPeriodRepository } from '../infrastructure/persistence/dynamodb-practicing-period.repository';
import { DynamoDBUserRepository } from '../infrastructure/persistence/dynamodb-user.repository';

// Shared Clients
const rawClient = new DynamoDBClient({
  ...(process.env.LOCALSTACK_ENDPOINT ? { endpoint: process.env.LOCALSTACK_ENDPOINT } : {}),
  maxAttempts: 3,
});

export const dbClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// Services
export const calendarService = new UmAlQuraCalendarService();
export const salahCalculator = new SalahDebtCalculator(calendarService);
export const sawmCalculator = new SawmDebtCalculator(calendarService);

// Repositories
export const prayerLogRepo = new DynamoDBPrayerLogRepository(dbClient);
export const fastLogRepo = new DynamoDBFastLogRepository(dbClient);
export const periodRepo = new DynamoDBPracticingPeriodRepository(dbClient);
export const userRepo = new DynamoDBUserRepository(dbClient);
