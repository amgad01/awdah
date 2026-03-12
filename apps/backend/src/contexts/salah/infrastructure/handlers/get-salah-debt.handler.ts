import { getSalahDebtUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';

export const handler = wrapHandler('SalahContext', async ({ userId }) => {
  const result = await getSalahDebtUseCase.execute(userId);
  return responses.ok(result);
});
