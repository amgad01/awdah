import {
  IUserDataLifecycleService,
  type UserDataExport,
} from '../../domain/services/user-data-lifecycle.service.interface';

export interface ExportDataCommand {
  userId: string;
}

export class ExportDataUseCase {
  constructor(private readonly userDataLifecycleService: IUserDataLifecycleService) {}

  async execute(command: ExportDataCommand): Promise<UserDataExport> {
    return this.userDataLifecycleService.exportUserData(command.userId);
  }
}
