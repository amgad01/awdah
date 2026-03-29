import { updatePracticingPeriodUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { updatePracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SALAH, updatePracticingPeriodUseCase, {
  schema: updatePracticingPeriodSchema,
  statusCode: StatusCodes.OK,
  successMessage: MESSAGES.SALAH.PERIOD_UPDATED,
});
