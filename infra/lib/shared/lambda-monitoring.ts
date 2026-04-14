export interface LambdaMonitoringTarget {
  id: string;
  label: string;
}

export const USER_LAMBDA_MONITORING_TARGETS = {
  getUserSettings: { id: 'GetUserSettingsFn', label: 'GetUserSettings' },
  updateUserSettings: { id: 'UpdateUserSettingsFn', label: 'UpdateUserSettings' },
  deleteAccount: { id: 'DeleteAccountFn', label: 'DeleteAccount' },
  exportData: { id: 'ExportDataFn', label: 'ExportData' },
  getUserLifecycleJobStatus: {
    id: 'GetUserLifecycleJobStatusFn',
    label: 'GetUserLifecycleJobStatus',
  },
  downloadExportData: { id: 'DownloadExportDataFn', label: 'DownloadExportData' },
  finalizeDeleteAccount: { id: 'FinalizeDeleteAccountFn', label: 'FinalizeDeleteAccount' },
  processUserLifecycleJob: { id: 'ProcessUserLifecycleJobFn', label: 'ProcessUserLifecycleJob' },
} as const;
