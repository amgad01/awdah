import { logPrayerUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';

export const handler = wrapHandler('SalahContext', async ({ userId, body }: { userId: string; body: any }) => {
  await logPrayerUseCase.execute({ ...body, userId });
  return responses.created({ message: 'Prayer logged successfully' });
});
