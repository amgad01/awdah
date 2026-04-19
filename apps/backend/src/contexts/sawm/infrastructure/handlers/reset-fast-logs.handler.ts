import { getResetFastLogsUseCase } from '../../../../shared/di/sawm-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SAWM, getResetFastLogsUseCase(), {
  transformInput: (userId) => ({ userId }),
  statusCode: StatusCodes.ACCEPTED,
  present: (job) => ({
    message: MESSAGES.SAWM.FASTS_RESET_STARTED,
    job,
  }),
});
