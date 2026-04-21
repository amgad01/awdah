import { getUpdateUserSettingsUseCase } from '../../../../shared/di/user-use-cases';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { updateUserSettingsSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.USER, getUpdateUserSettingsUseCase(), {
  schema: updateUserSettingsSchema,
  successMessage: MESSAGES.USER.SETTINGS_UPDATED,
});
