import { deletePracticingPeriodUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { deletePracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, deletePracticingPeriodUseCase, {
  schema: deletePracticingPeriodSchema,
  useQuery: true,
  successMessage: 'Practicing period deleted successfully',
  transformInput: (userId, input) => ({
    userId,
    periodId: input['periodId'] as string,
  }),
});
