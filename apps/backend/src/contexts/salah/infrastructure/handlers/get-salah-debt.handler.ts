import { getSalahDebtUseCase } from '../../../../shared/di/salah-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.SALAH, getSalahDebtUseCase(), {
  statusCode: StatusCodes.OK,
  transformInput: (userId) => userId,
});
