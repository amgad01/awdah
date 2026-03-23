import { resetPrayerLogsUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, resetPrayerLogsUseCase, {
  transformInput: (userId) => ({ userId }),
  successMessage: MESSAGES.SALAH.PRAYERS_RESET,
});
