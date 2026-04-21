import { getDeletePrayerLogUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { deletePrayerLogSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.SALAH, getDeletePrayerLogUseCase(), {
  schema: deletePrayerLogSchema,
  useQuery: true,
  successMessage: MESSAGES.SALAH.PRAYER_DELETED,
});
