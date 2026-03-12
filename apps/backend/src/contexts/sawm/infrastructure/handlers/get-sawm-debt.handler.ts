import { getSawmDebtUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';

export const handler = wrapHandler('SawmContext', async ({ userId }) => {
  const result = await getSawmDebtUseCase.execute(userId);
  return responses.ok(result);
});
