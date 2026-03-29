import { exportDataUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.USER, exportDataUseCase, {
  transformInput: (userId) => ({ userId }),
  statusCode: StatusCodes.ACCEPTED,
  present: (job) => ({
    message: MESSAGES.USER.DATA_EXPORT_STARTED,
    job,
  }),
});
