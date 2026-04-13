import { deleteAccountUseCase } from '../../../../shared/di/user-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.USER, deleteAccountUseCase, {
  transformInput: (userId) => ({ userId }),
  statusCode: StatusCodes.ACCEPTED,
  present: (job) => ({
    message: MESSAGES.USER.ACCOUNT_DELETION_STARTED,
    job,
  }),
});
