import { addPracticingPeriodUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(
  CONTEXTS.SALAH,
  async ({ userId, body }: { userId: string; body: Record<string, unknown> }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodId = await addPracticingPeriodUseCase.execute({ ...(body as any), userId });
    return responses.created({
      data: { periodId },
      message: 'Practicing period added successfully',
    });
  },
);
