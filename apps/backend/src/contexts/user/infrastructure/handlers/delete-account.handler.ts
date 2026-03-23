import { deleteAccountUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.USER, deleteAccountUseCase, {
  transformInput: (userId) => ({ userId }),
  present: (result) => ({
    message: result.authDeleted
      ? MESSAGES.USER.ACCOUNT_DELETED
      : MESSAGES.USER.ACCOUNT_DELETED_WITH_AUTH_CLEANUP_PENDING,
    authDeleted: result.authDeleted,
  }),
});
