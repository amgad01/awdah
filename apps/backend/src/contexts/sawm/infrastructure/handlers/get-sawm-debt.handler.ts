import { getSawmDebtUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SAWM, getSawmDebtUseCase, {
  transformInput: (userId) => userId,
});
