import { deleteFastLogUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { deleteFastLogSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SAWM, deleteFastLogUseCase, {
  schema: deleteFastLogSchema,
  useQuery: true,
  successMessage: 'Fast log deleted',
});
