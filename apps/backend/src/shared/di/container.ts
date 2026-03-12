import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBPrayerLogRepository } from '../infrastructure/persistence/dynamodb-prayer-log.repository';
import { DynamoDBFastLogRepository } from '../infrastructure/persistence/dynamodb-fast-log.repository';
import { DynamoDBPracticingPeriodRepository } from '../infrastructure/persistence/dynamodb-practicing-period.repository';
import { DynamoDBUserRepository } from '../infrastructure/persistence/dynamodb-user.repository';
import { UmAlQuraCalendarService } from '../infrastructure/services/umalqura-calendar.service';

import { LogPrayerUseCase } from '../../contexts/salah/application/use-cases/log-prayer.use-case';
import { GetSalahDebtUseCase } from '../../contexts/salah/application/use-cases/get-salah-debt.use-case';
import { SalahDebtCalculator } from '../../contexts/salah/domain/services/debt-calculator.service';

import { LogFastUseCase } from '../../contexts/sawm/application/use-cases/log-fast.use-case';
import { GetSawmDebtUseCase } from '../../contexts/sawm/application/use-cases/get-sawm-debt.use-case';
import { SawmDebtCalculator } from '../../contexts/sawm/domain/services/sawm-debt-calculator.service';

import { AddPracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/add-practicing-period.use-case';

// Shared Clients
const dbClient = new DynamoDBClient({});

// Services
const calendarService = new UmAlQuraCalendarService();
const salahCalculator = new SalahDebtCalculator(calendarService);
const sawmCalculator = new SawmDebtCalculator(calendarService);

// Repositories
const prayerLogRepo = new DynamoDBPrayerLogRepository(dbClient);
const fastLogRepo = new DynamoDBFastLogRepository(dbClient);
const periodRepo = new DynamoDBPracticingPeriodRepository(dbClient);
const userRepo = new DynamoDBUserRepository(dbClient);

// Use Cases
export const logPrayerUseCase = new LogPrayerUseCase(prayerLogRepo);
export const getSalahDebtUseCase = new GetSalahDebtUseCase(
  userRepo,
  prayerLogRepo,
  periodRepo,
  salahCalculator,
  calendarService,
);

export const logFastUseCase = new LogFastUseCase(fastLogRepo);
export const getSawmDebtUseCase = new GetSawmDebtUseCase(
  userRepo,
  fastLogRepo,
  periodRepo,
  sawmCalculator,
  calendarService,
);

export const addPracticingPeriodUseCase = new AddPracticingPeriodUseCase(periodRepo);
