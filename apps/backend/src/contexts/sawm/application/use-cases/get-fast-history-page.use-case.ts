import { HijriDate, UserId, type BreakReason, type LogType as LogTypeT } from '@awdah/shared';
import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';

export interface GetFastHistoryPageCommand {
  userId: string;
  startDate: string;
  endDate: string;
  limit: number;
  cursor?: string;
}

export interface FastHistoryPageDto {
  items: Array<{
    eventId: string;
    date: string;
    type: LogTypeT;
    loggedAt: string;
    breakReason?: BreakReason;
  }>;
  nextCursor?: string;
  hasMore: boolean;
}

export class GetFastHistoryPageUseCase {
  constructor(private readonly repository: IFastLogRepository) {}

  async execute(command: GetFastHistoryPageCommand): Promise<FastHistoryPageDto> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);

    const page = await this.repository.findPageByUserAndDateRange(
      new UserId(command.userId),
      start,
      end,
      {
        limit: command.limit,
        cursor: command.cursor,
      },
    );

    return {
      items: page.items.map((log) => ({
        eventId: log.eventId.toString(),
        date: log.date.toString(),
        type: log.type.getValue(),
        loggedAt: log.loggedAt.toISOString(),
        ...(log.breakReason !== undefined && { breakReason: log.breakReason }),
      })),
      nextCursor: page.nextCursor,
      hasMore: page.nextCursor !== undefined,
    };
  }
}
