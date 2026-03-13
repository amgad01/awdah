import { logFastUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(
  CONTEXTS.SAWM,
  async ({ userId, body }: { userId: string; body: Record<string, unknown> }) => {
    await logFastUseCase.execute({
      userId,
      date: body.date as string,
      type: body.type as string,
    });
    return responses.created({ message: 'Fast logged successfully' });
  },
);
