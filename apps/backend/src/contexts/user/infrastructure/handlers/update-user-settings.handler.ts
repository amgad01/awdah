import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { container } from '../../../../shared/di/container';
import { ValidationError, GENDERS } from '@awdah/shared';
import type { Gender } from '@awdah/shared';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(CONTEXTS.USER, async (req) => {
  const { body, userId } = req;

  if (!body.bulughDate || !body.gender) {
    throw new ValidationError('Missing required fields: bulughDate, gender');
  }

  const gender = body.gender as string;
  if (!GENDERS.includes(gender as Gender)) {
    throw new ValidationError(`Invalid gender: must be one of ${GENDERS.join(', ')}`);
  }

  const useCase = container.getUpdateUserSettingsUseCase();
  await useCase.execute({
    userId,
    bulughDate: body.bulughDate as string,
    gender: gender as Gender,
  });

  return {
    statusCode: 200,
    body: { message: 'Settings updated successfully' },
  };
});
