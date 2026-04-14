import { getSalahDebtUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, getSalahDebtUseCase, {
  transformInput: (userId) => userId,
});
