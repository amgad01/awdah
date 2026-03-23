import { resetFastLogsUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { MESSAGES } from '../../../../shared/constants/messages';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SAWM, resetFastLogsUseCase, {
  transformInput: (userId) => ({ userId }),
  successMessage: MESSAGES.SAWM.FASTS_RESET,
});
