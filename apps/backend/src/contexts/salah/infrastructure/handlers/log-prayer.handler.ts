import { logPrayerUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(
  CONTEXTS.SALAH,
  async ({ userId, body }: { userId: string; body: Record<string, unknown> }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logPrayerUseCase.execute({ ...(body as any), userId });
    return responses.created({ message: 'Prayer logged successfully' });
  },
);
