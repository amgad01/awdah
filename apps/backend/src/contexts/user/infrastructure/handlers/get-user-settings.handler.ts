import { getUserSettingsUseCase } from '../../../../shared/di/user-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { StatusCodes } from '@awdah/shared';

export const handler = createHandler(CONTEXTS.USER, getUserSettingsUseCase(), {
  statusCode: StatusCodes.OK,
  transformInput: (userId) => userId,
});
