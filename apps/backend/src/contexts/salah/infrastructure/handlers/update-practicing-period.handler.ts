import { updatePracticingPeriodUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { updatePracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.SALAH, updatePracticingPeriodUseCase, {
  schema: updatePracticingPeriodSchema,
  statusCode: 200,
  successMessage: MESSAGES.SALAH.PERIOD_UPDATED,
});
