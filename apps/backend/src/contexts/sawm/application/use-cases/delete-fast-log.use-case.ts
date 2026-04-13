import { IFastLogRepository } from '../../domain/repositories/fast-log.repository';
import { HijriDate, UserId, EventId } from '@awdah/shared';

export interface DeleteFastLogCommand {
  userId: string;
  date: string;
  eventId: string;
}

export class DeleteFastLogUseCase {
  constructor(private readonly repository: IFastLogRepository) {}

  async execute(command: DeleteFastLogCommand): Promise<void> {
    const date = HijriDate.fromString(command.date);
    await this.repository.deleteEntry(
      new UserId(command.userId),
      date,
      new EventId(command.eventId),
    );
  }
}
