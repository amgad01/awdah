import { getPrayerHistoryUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { prayerHistoryQuerySchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, getPrayerHistoryUseCase(), {
  schema: prayerHistoryQuerySchema,
  useQuery: true,
});
