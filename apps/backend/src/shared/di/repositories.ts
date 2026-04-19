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

const rawClient = new DynamoDBClient(createAwsClientConfig({ region: settings.region }));
const dbClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

let idGeneratorInstance: UlidGenerator | undefined;
export const getIdGenerator = (): UlidGenerator => {
  if (!idGeneratorInstance) {
    idGeneratorInstance = new UlidGenerator();
  }
  return idGeneratorInstance;
};

let calendarServiceInstance: UmAlQuraCalendarService | undefined;
export const getCalendarService = (): UmAlQuraCalendarService => {
  if (!calendarServiceInstance) {
    calendarServiceInstance = new UmAlQuraCalendarService();
  }
  return calendarServiceInstance;
};

let salahCalculatorInstance: SalahDebtCalculator | undefined;
export const getSalahCalculator = (): SalahDebtCalculator => {
  if (!salahCalculatorInstance) {
    salahCalculatorInstance = new SalahDebtCalculator(getCalendarService());
  }
  return salahCalculatorInstance;
};

let sawmCalculatorInstance: SawmDebtCalculator | undefined;
export const getSawmCalculator = (): SawmDebtCalculator => {
  if (!sawmCalculatorInstance) {
    sawmCalculatorInstance = new SawmDebtCalculator(getCalendarService());
  }
  return sawmCalculatorInstance;
};

let prayerLogRepoInstance: DynamoDBPrayerLogRepository | undefined;
export const getPrayerLogRepo = (): DynamoDBPrayerLogRepository => {
  if (!prayerLogRepoInstance) {
    prayerLogRepoInstance = new DynamoDBPrayerLogRepository(dbClient);
  }
  return prayerLogRepoInstance;
};

let fastLogRepoInstance: DynamoDBFastLogRepository | undefined;
export const getFastLogRepo = (): DynamoDBFastLogRepository => {
  if (!fastLogRepoInstance) {
    fastLogRepoInstance = new DynamoDBFastLogRepository(dbClient);
  }
  return fastLogRepoInstance;
};

let periodRepoInstance: DynamoDBPracticingPeriodRepository | undefined;
export const getPeriodRepo = (): DynamoDBPracticingPeriodRepository => {
  if (!periodRepoInstance) {
    periodRepoInstance = new DynamoDBPracticingPeriodRepository(dbClient);
  }
  return periodRepoInstance;
};

let userRepoInstance: DynamoDBUserRepository | undefined;
export const getUserRepo = (): DynamoDBUserRepository => {
  if (!userRepoInstance) {
    userRepoInstance = new DynamoDBUserRepository(dbClient);
  }
  return userRepoInstance;
};

let userDataLifecycleServiceInstance: DynamoDBUserDataLifecycleService | undefined;
export const getUserDataLifecycleService = (): DynamoDBUserDataLifecycleService => {
  if (!userDataLifecycleServiceInstance) {
    userDataLifecycleServiceInstance = new DynamoDBUserDataLifecycleService(dbClient);
  }
  return userDataLifecycleServiceInstance;
};

let userLifecycleJobRepoInstance: DynamoDBUserLifecycleJobRepository | undefined;
export const getUserLifecycleJobRepo = (): DynamoDBUserLifecycleJobRepository => {
  if (!userLifecycleJobRepoInstance) {
    userLifecycleJobRepoInstance = new DynamoDBUserLifecycleJobRepository(dbClient);
  }
  return userLifecycleJobRepoInstance;
};

let deletedUsersRepoInstance: DynamoDBDeletedUsersRepository | undefined;
export const getDeletedUsersRepo = (): DynamoDBDeletedUsersRepository => {
  if (!deletedUsersRepoInstance) {
    deletedUsersRepoInstance = new DynamoDBDeletedUsersRepository(dbClient);
  }
  return deletedUsersRepoInstance;
};

export { dbClient };
