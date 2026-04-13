import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';
import { HijriDate, UserId } from '@awdah/shared';
import type { BreakReason, LogType as LogTypeT } from '@awdah/shared';

export interface GetFastHistoryCommand {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface FastLogDto {
  eventId: string;
  date: string;
  type: LogTypeT;
  loggedAt: string;
  breakReason?: BreakReason;
}

export class GetFastHistoryUseCase {
  constructor(private readonly repository: IFastLogRepository) {}

  async execute(command: GetFastHistoryCommand): Promise<FastLogDto[]> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);

    const logs = await this.repository.findByUserAndDateRange(
      new UserId(command.userId),
      start,
      end,
    );
    return logs.map((log) => ({
      eventId: log.eventId.toString(),
      date: log.date.toString(),
      type: log.type.getValue(),
      loggedAt: log.loggedAt.toISOString(),
      ...(log.breakReason !== undefined && { breakReason: log.breakReason }),
    }));
  }
}
