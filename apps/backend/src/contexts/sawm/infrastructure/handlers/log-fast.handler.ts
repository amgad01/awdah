import { logFastUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';
import { CONTEXTS } from '../../../../shared/constants/contexts';

/**
 * POST /sawm/log
 */
export const handler = wrapHandler(
  CONTEXTS.SAWM,
  async ({ userId, body }: { userId: string; body: Record<string, unknown> }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logFastUseCase.execute({ ...(body as any), userId });
    return responses.created({ message: 'Fast logged successfully' });
  },
);
