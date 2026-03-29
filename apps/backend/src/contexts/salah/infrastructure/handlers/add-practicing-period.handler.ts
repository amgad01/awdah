import { addPracticingPeriodUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { addPracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SALAH, addPracticingPeriodUseCase, {
  schema: addPracticingPeriodSchema,
  statusCode: StatusCodes.CREATED,
  successMessage: MESSAGES.SALAH.PERIOD_ADDED,
});
