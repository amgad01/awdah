export const MESSAGES = {
  USER: {
    DATA_EXPORTED: 'Data exported successfully',
    ACCOUNT_DELETED: 'Account deleted successfully',
    ACCOUNT_DELETED_WITH_AUTH_CLEANUP_PENDING:
      'Account data was deleted, but identity cleanup could not be completed automatically.',
    SETTINGS_UPDATED: 'Settings updated successfully',
  },
  SALAH: {
    PRAYER_LOGGED: 'Prayer logged successfully',
    PRAYER_DELETED: 'Prayer log deleted',
    PERIOD_ADDED: 'Practicing period added successfully',
    PERIOD_UPDATED: 'Practicing period updated successfully',
    PERIOD_DELETED: 'Practicing period deleted',
    PRAYERS_RESET: 'All prayer logs cleared',
  },
  SAWM: {
    FAST_LOGGED: 'Fast logged successfully',
    FAST_DELETED: 'Fast log deleted',
    FASTS_RESET: 'All fast logs cleared',
  },
  SHARED: {
    OPERATION_SUCCESSFUL: 'Operation successful',
    SOMETHING_WENT_WRONG: 'An unexpected error occurred',
  },
} as const;
