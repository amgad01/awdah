import { getUserSettingsUseCase } from '../../../../shared/di/user-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { createHandler } from '../../../../shared/middleware/create-handler';

export const handler = createHandler(CONTEXTS.USER, getUserSettingsUseCase, {
  transformInput: (userId) => userId,
});
