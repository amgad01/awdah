import { deletePracticingPeriodUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { deletePracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.SALAH, deletePracticingPeriodUseCase, {
  schema: deletePracticingPeriodSchema,
  useQuery: true,
  successMessage: MESSAGES.SALAH.PERIOD_DELETED,
  transformInput: (userId, input) => ({
    userId,
    periodId: input['periodId'] as string,
  }),
});
