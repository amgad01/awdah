import { deleteFastLogUseCase } from '../../../../shared/di/sawm-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { deleteFastLogSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.SAWM, deleteFastLogUseCase, {
  schema: deleteFastLogSchema,
  useQuery: true,
  successMessage: MESSAGES.SAWM.FAST_DELETED,
});
