import { logFastUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { logFastSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SAWM, logFastUseCase, {
  schema: logFastSchema,
  statusCode: 201,
  successMessage: 'Fast logged successfully',
});
