import {
  api,
  type DeleteAccountResponse,
  type ExportDownloadResponse,
  type UserLifecycleJobEnvelope,
  type UserLifecycleJobResponse,
  type UserProfileResponse,
} from '@/lib/api';
import {
  parseDeleteAccountResponse,
  parseExportDownloadResponse,
  parseUserJobStatusResponse,
  parseUserLifecycleEnvelope,
  parseUserProfileResponse,
} from './user-response';

export interface UpdateUserProfileInput {
  username?: string;
  bulughDate: string;
  gender: string;
  dateOfBirth?: string;
  revertDate?: string;
}

export const userRepository = {
  getProfile: async (signal?: AbortSignal): Promise<UserProfileResponse | null> =>
    parseUserProfileResponse(await api.user.getProfile({ signal })),
  updateProfile: (data: UpdateUserProfileInput) => api.user.updateProfile(data),
  startDeleteAccount: async (): Promise<UserLifecycleJobEnvelope | null> =>
    parseUserLifecycleEnvelope(await api.user.startDeleteAccount()),
  finalizeDeleteAccount: async (jobId: string): Promise<DeleteAccountResponse | null> =>
    parseDeleteAccountResponse(await api.user.finalizeDeleteAccount(jobId)),
  getJobStatus: async (jobId: string): Promise<{ job: UserLifecycleJobResponse } | null> =>
    parseUserJobStatusResponse(await api.user.getJobStatus(jobId)),
  startExportData: async (): Promise<UserLifecycleJobEnvelope | null> =>
    parseUserLifecycleEnvelope(await api.user.startExportData()),
  downloadExportData: async (jobId: string): Promise<ExportDownloadResponse | null> =>
    parseExportDownloadResponse(await api.user.downloadExportData(jobId)),
};
