import { deletePrayerLogUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { deletePrayerLogSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, deletePrayerLogUseCase, {
  schema: deletePrayerLogSchema,
  useQuery: true,
  successMessage: 'Prayer log deleted',
});
