/**
 * Compatibility constants for the API stack refactor.
 *
 * The API implementation was split into nested constructs, but production still
 * expects the original CloudFormation logical IDs and export names. These
 * values let us keep a safe transition release without replacing live Lambdas
 * or deleting exports that consumer stacks still reference during rollout.
 */
export const LEGACY_LAMBDA_REF_EXPORT_SUFFIXES = {
  LogPrayerFn: 'LogPrayerFn4A045665ABBC3282',
  GetSalahDebtFn: 'GetSalahDebtFn84DE77D8BD6F8FC7',
  GetPrayerHistoryFn: 'GetPrayerHistoryFn0D494B63BCF758B7',
  GetPrayerHistoryPageFn: 'GetPrayerHistoryPageFn1051A9C6BB7295D2',
  DeletePrayerLogFn: 'DeletePrayerLogFn98F92130DD3B9CFA',
  ResetPrayerLogsFn: 'ResetPrayerLogsFn881C6B53D36D840A',
  AddPeriodFn: 'AddPeriodFnC099B3B039E0C8E9',
  UpdatePeriodFn: 'UpdatePeriodFn965F74AB43FA5CB8',
  GetPeriodsFn: 'GetPeriodsFn04E0E5AE1D9A4F3B',
  DeletePeriodFn: 'DeletePeriodFn33A2517784DC0417',
  LogFastFn: 'LogFastFnB6FF55853E64A3F1',
  GetSawmDebtFn: 'GetSawmDebtFn38BD00301A187970',
  GetFastHistoryFn: 'GetFastHistoryFn03AE1F8CEB88D772',
  GetFastHistoryPageFn: 'GetFastHistoryPageFn6F57DFFADA29954F',
  DeleteFastLogFn: 'DeleteFastLogFn8C9A30146141298D',
  ResetFastLogsFn: 'ResetFastLogsFn8ADF710DD15FDC74',
  GetUserSettingsFn: 'GetUserSettingsFn089F3F51DDD3B1EA',
  UpdateUserSettingsFn: 'UpdateUserSettingsFnD0017D4D511598D9',
  DeleteAccountFn: 'DeleteAccountFn90E696314545FDD0',
  ExportDataFn: 'ExportDataFn52B7CD2CD1DDAF82',
  GetUserLifecycleJobStatusFn: 'GetUserLifecycleJobStatusFn743ED56C3F43D250',
  DownloadExportDataFn: 'DownloadExportDataFn081E790CD0392DA7',
  FinalizeDeleteAccountFn: 'FinalizeDeleteAccountFnFE8A40231097D62B',
  ProcessUserLifecycleJobFn: 'ProcessUserLifecycleJobFn75D2750B18F0286A',
} as const;

export const WARM_LAMBDA_IDS = [
  'GetUserSettingsFn',
  'GetSalahDebtFn',
  'GetSawmDebtFn',
  'GetPeriodsFn',
] as const;
