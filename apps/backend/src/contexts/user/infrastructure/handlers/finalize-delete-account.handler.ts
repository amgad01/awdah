import { finalizeDeleteAccountUseCase } from '../../../../shared/di/user-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { userLifecycleJobQuerySchema } from '../../../../shared/validation/schemas';

export const handler = createHandler(CONTEXTS.USER, finalizeDeleteAccountUseCase, {
  useQuery: true,
  schema: userLifecycleJobQuerySchema,
  transformInput: (userId, input) => ({
    userId,
    jobId: input.jobId as string,
  }),
  present: (result) => ({
    message: result.authDeleted
      ? MESSAGES.USER.ACCOUNT_AUTH_DELETED
      : MESSAGES.USER.ACCOUNT_DELETED_WITH_AUTH_CLEANUP_PENDING,
    authDeleted: result.authDeleted,
  }),
});
