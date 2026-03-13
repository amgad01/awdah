import { wrapHandler } from '../../../../shared/middleware/wrap-handler';
import { container } from '../../../../shared/di/container';
import { CONTEXTS } from '../../../../shared/constants/contexts';

export const handler = wrapHandler(CONTEXTS.USER, async (req) => {
  const useCase = container.getGetUserSettingsUseCase();
  const settings = await useCase.execute(req.userId);

  return {
    statusCode: 200,
    body: settings,
  };
});
