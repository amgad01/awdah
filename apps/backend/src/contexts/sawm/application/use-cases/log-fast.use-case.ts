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
    const fastLog = new FastLog({
      userId: command.userId,
      eventId: ulid(),
      date: HijriDate.fromString(command.date),
      type: new LogType(command.type),
      loggedAt: new Date(),
    });

    await this.repository.save(fastLog);
  }
}
