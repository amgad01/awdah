import { getUserLifecycleJobStatusUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { userLifecycleJobQuerySchema } from '../../../../shared/validation/schemas';

export const handler = createHandler(CONTEXTS.USER, getUserLifecycleJobStatusUseCase, {
  useQuery: true,
  schema: userLifecycleJobQuerySchema,
  transformInput: (userId, input) => ({
    userId,
    jobId: input.jobId as string,
  }),
  present: (job) => ({
    job,
  }),
});
