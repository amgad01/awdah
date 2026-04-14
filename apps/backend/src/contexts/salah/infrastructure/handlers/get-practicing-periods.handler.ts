import { getPracticingPeriodsUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, getPracticingPeriodsUseCase, {
  transformInput: (userId) => userId,
});
