import { getLogFastUseCase } from '../../../../shared/di/sawm-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { logFastSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SAWM, getLogFastUseCase(), {
  schema: logFastSchema,
  statusCode: StatusCodes.CREATED,
  successMessage: MESSAGES.SAWM.FAST_LOGGED,
});
