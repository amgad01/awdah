import express from 'express';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { handler as getUserSettingsHandler } from '../../../contexts/user/infrastructure/handlers/get-user-settings.handler';
import { handler as updateUserSettingsHandler } from '../../../contexts/user/infrastructure/handlers/update-user-settings.handler';
import { handler as deleteAccountHandler } from '../../../contexts/user/infrastructure/handlers/delete-account.handler';
import { handler as exportDataHandler } from '../../../contexts/user/infrastructure/handlers/export-data.handler';

export const registerUserRoutes = (
  router: express.Router,
  apiVersion: string,
  runHandler: (
    handler: (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>,
    req: express.Request,
    res: express.Response,
  ) => Promise<void>,
) => {
  router.get(`${apiVersion}/user/profile`, (req, res) =>
    runHandler(getUserSettingsHandler, req, res),
  );
  router.post(`${apiVersion}/user/profile`, (req, res) =>
    runHandler(updateUserSettingsHandler, req, res),
  );
  router.delete(`${apiVersion}/user/account`, (req, res) =>
    runHandler(deleteAccountHandler, req, res),
  );
  router.get(`${apiVersion}/user/export`, (req, res) => runHandler(exportDataHandler, req, res));
};
