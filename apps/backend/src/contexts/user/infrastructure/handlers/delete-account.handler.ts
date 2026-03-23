import { deleteAccountUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.USER, deleteAccountUseCase, {
  transformInput: (userId) => ({ userId }),
  statusCode: 202,
  present: (job) => ({
    message: MESSAGES.USER.ACCOUNT_DELETION_STARTED,
    job,
  }),
});
