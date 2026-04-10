import {
  api,
  type DeleteAccountResponse,
  type ExportDownloadResponse,
  type UserLifecycleJobEnvelope,
  type UserLifecycleJobResponse,
  type UserProfileResponse,
} from '@/lib/api';

export interface UpdateUserProfileInput {
  username?: string;
  bulughDate: string;
  gender: string;
  dateOfBirth?: string;
  revertDate?: string;
}

export const userRepository = {
  getProfile: (signal?: AbortSignal) =>
    api.user.getProfile({ signal }) as Promise<UserProfileResponse | null>,
  updateProfile: (data: UpdateUserProfileInput) => api.user.updateProfile(data),
  startDeleteAccount: () =>
    api.user.startDeleteAccount() as Promise<UserLifecycleJobEnvelope | null>,
  finalizeDeleteAccount: (jobId: string) =>
    api.user.finalizeDeleteAccount(jobId) as Promise<DeleteAccountResponse | null>,
  getJobStatus: (jobId: string) =>
    api.user.getJobStatus(jobId) as Promise<{ job: UserLifecycleJobResponse } | null>,
  startExportData: () => api.user.startExportData() as Promise<UserLifecycleJobEnvelope | null>,
  downloadExportData: (jobId: string) =>
    api.user.downloadExportData(jobId) as Promise<ExportDownloadResponse | null>,
};
