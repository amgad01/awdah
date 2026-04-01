import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';
import { FastLog } from '../../domain/entities/fast-log.entity';
import { LogType } from '../../../shared/domain/value-objects/log-type';
import { HijriDate } from '@awdah/shared';
import { ulid } from 'ulid';

export interface LogFastCommand {
  userId: string;
  date: string; // YYYY-MM-DD Hijri
  type: string;
}

export class LogFastUseCase {
  constructor(private readonly repository: IFastLogRepository) {}

  async execute(command: LogFastCommand): Promise<void> {
    const date = HijriDate.fromString(command.date);
    const type = new LogType(command.type);
    const existingLogs = await this.repository.findByUserAndDate(command.userId, date);

    // A fast slot is effectively unique per (date, type). Treat duplicate submissions
    // as idempotent so retries do not inflate qadaa completion counts.
    if (existingLogs.some((log) => log.type.getValue() === type.getValue())) {
      return;
    }

    const fastLog = new FastLog({
      userId: command.userId,
      eventId: ulid(),
      date,
      type,
      loggedAt: new Date(),
    });

    await this.repository.save(fastLog);
  }
}
