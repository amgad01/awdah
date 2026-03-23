import { updateUserSettingsUseCase } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';
import { updateUserSettingsSchema } from '../../../../shared/validation/schemas';
import { createHandler } from '../../../../shared/middleware/create-handler';
import { MESSAGES } from '../../../../shared/constants/messages';

export const handler = createHandler(CONTEXTS.USER, updateUserSettingsUseCase, {
  schema: updateUserSettingsSchema,
  successMessage: MESSAGES.USER.SETTINGS_UPDATED,
});
