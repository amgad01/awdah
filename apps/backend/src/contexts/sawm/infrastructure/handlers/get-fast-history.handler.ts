import { getFastHistoryUseCase } from '../../../../shared/di/sawm-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { fastHistoryQuerySchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SAWM, getFastHistoryUseCase(), {
  schema: fastHistoryQuerySchema,
  useQuery: true,
});
