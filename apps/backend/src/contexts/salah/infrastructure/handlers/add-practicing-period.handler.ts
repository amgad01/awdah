import { addPracticingPeriodUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { addPracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.SALAH, addPracticingPeriodUseCase, {
  schema: addPracticingPeriodSchema,
  statusCode: 201,
  successMessage: MESSAGES.SALAH.PERIOD_ADDED,
});
