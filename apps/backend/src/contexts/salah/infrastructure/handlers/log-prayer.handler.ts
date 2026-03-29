import { logPrayerUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { logPrayerSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SALAH, logPrayerUseCase, {
  schema: logPrayerSchema,
  statusCode: StatusCodes.CREATED,
  successMessage: MESSAGES.SALAH.PRAYER_LOGGED,
});
