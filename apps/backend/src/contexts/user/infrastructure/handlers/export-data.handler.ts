import { exportDataUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.USER, exportDataUseCase, {
  transformInput: (userId) => ({ userId }),
  successMessage: MESSAGES.USER.DATA_EXPORTED,
});
