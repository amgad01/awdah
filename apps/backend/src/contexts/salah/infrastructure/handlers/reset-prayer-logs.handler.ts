import { getResetPrayerLogsUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SALAH, getResetPrayerLogsUseCase(), {
  transformInput: (userId) => ({ userId }),
  statusCode: StatusCodes.ACCEPTED,
  successMessage: MESSAGES.SALAH.PRAYERS_RESET_STARTED,
  present: (job) => ({
    message: MESSAGES.SALAH.PRAYERS_RESET_STARTED,
    job,
  }),
});
