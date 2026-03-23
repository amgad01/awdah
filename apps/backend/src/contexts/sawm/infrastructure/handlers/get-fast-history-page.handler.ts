import { getFastHistoryPageUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { pagedHistoryQuerySchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SAWM, getFastHistoryPageUseCase, {
  schema: pagedHistoryQuerySchema,
  useQuery: true,
});
