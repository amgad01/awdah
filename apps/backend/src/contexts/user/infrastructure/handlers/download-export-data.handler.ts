import { getDownloadExportDataUseCase } from '../../../../shared/di/user-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { userLifecycleJobQuerySchema } from '../../../../shared/validation/schemas';

export const handler = createHandler(CONTEXTS.USER, getDownloadExportDataUseCase(), {
  useQuery: true,
  schema: userLifecycleJobQuerySchema,
  transformInput: (userId, input) => ({
    userId,
    jobId: input.jobId as string,
  }),
  present: (result) => ({
    message: MESSAGES.USER.DATA_EXPORTED,
    ...result,
  }),
});
