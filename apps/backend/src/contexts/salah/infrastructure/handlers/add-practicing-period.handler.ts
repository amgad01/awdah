import { addPracticingPeriodUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { addPracticingPeriodSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.SALAH, addPracticingPeriodUseCase, {
  schema: addPracticingPeriodSchema,
  statusCode: 201,
  successMessage: 'Practicing period added successfully',
});
