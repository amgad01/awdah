export const MESSAGES = {
  USER: {
    DATA_EXPORT_STARTED: 'Data export started successfully',
    DATA_EXPORTED: 'Data exported successfully',
    ACCOUNT_DELETION_STARTED: 'Account deletion started successfully',
    ACCOUNT_DELETED: 'Account deleted successfully',
    ACCOUNT_DELETED_WITH_AUTH_CLEANUP_PENDING:
      'Account data was deleted, but identity cleanup could not be completed automatically.',
    ACCOUNT_AUTH_DELETED: 'Account sign-in access deleted successfully',
    SETTINGS_UPDATED: 'Settings updated successfully',
  },
  SALAH: {
    PRAYER_LOGGED: 'Prayer logged successfully',
    PRAYER_DELETED: 'Prayer log deleted',
    PERIOD_ADDED: 'Practicing period added successfully',
    PERIOD_UPDATED: 'Practicing period updated successfully',
    PERIOD_DELETED: 'Practicing period deleted',
    PRAYERS_RESET: 'All prayer logs cleared',
    PRAYERS_RESET_STARTED: 'Prayer log reset started',
  },
  SAWM: {
    FAST_LOGGED: 'Fast logged successfully',
    FAST_DELETED: 'Fast log deleted',
    FASTS_RESET: 'All fast logs cleared',
    FASTS_RESET_STARTED: 'Fast log reset started',
  },
  SHARED: {
    OPERATION_SUCCESSFUL: 'Operation successful',
    SOMETHING_WENT_WRONG: 'An unexpected error occurred',
  },
} as const;
