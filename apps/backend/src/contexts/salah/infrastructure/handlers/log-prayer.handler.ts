import { logPrayerUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { logPrayerSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, logPrayerUseCase, {
  schema: logPrayerSchema,
  statusCode: 201,
  successMessage: 'Prayer logged successfully',
});
