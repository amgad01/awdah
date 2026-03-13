import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { container } from '../../../../shared/di/container';
import { ValidationError } from '@awdah/shared';
import type { Gender } from '@awdah/shared';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(CONTEXTS.USER, async (req) => {
  const { body, userId } = req;

  if (!body.bulughDate || !body.gender) {
    throw new ValidationError('Missing required fields: bulughDate, gender');
  }

  const useCase = container.getUpdateUserSettingsUseCase();
  await useCase.execute({
    userId,
    bulughDate: body.bulughDate as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gender: body.gender as any as Gender,
  });

  return {
    statusCode: 200,
    body: { message: 'Settings updated successfully' },
  };
});
