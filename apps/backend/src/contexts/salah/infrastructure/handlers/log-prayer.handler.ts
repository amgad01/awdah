import { logPrayerUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(
  CONTEXTS.SALAH,
  async ({ userId, body }: { userId: string; body: Record<string, unknown> }) => {
    await logPrayerUseCase.execute({
      userId,
      date: body.date as string,
      prayerName: body.prayerName as string,
      type: body.type as string,
    });
    return responses.created({ message: 'Prayer logged successfully' });
  },
);
