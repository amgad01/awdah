import { logFastUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';

/**
 * POST /sawm/log
 */
export const handler = wrapHandler('SawmContext', async ({ userId, body }: { userId: string; body: any }) => {
  await logFastUseCase.execute({ ...body, userId });
  return responses.created({ message: 'Fast logged successfully' });
});
