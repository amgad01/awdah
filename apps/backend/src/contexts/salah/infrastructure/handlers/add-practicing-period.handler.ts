import { addPracticingPeriodUseCase } from '../../../../shared/di/container';
import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { responses } from '../../../../shared/middleware/responses';

export const handler = wrapHandler('SalahContext', async ({ userId, body }: { userId: string; body: any }) => {
  const periodId = await addPracticingPeriodUseCase.execute({ ...body, userId });
  return responses.created({ data: { periodId }, message: 'Practicing period added successfully' });
});
