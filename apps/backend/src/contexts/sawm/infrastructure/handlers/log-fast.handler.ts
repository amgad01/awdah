import { logFastUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { logFastSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.SAWM, logFastUseCase, {
  schema: logFastSchema,
  statusCode: 201,
  successMessage: MESSAGES.SAWM.FAST_LOGGED,
});
