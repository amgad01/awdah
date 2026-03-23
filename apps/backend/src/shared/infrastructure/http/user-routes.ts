import express from 'express';
import { handler as getUserSettingsHandler } from '../../../contexts/user/infrastructure/handlers/get-user-settings.handler';
import { handler as updateUserSettingsHandler } from '../../../contexts/user/infrastructure/handlers/update-user-settings.handler';
import { handler as deleteAccountHandler } from '../../../contexts/user/infrastructure/handlers/delete-account.handler';
import { handler as exportDataHandler } from '../../../contexts/user/infrastructure/handlers/export-data.handler';
import { registerRouteDefinitions, type RouteDefinition, type RouteRunner } from './route-registry';

const USER_ROUTES: RouteDefinition[] = [
  { method: 'get', path: '/user/profile', handler: getUserSettingsHandler },
  { method: 'post', path: '/user/profile', handler: updateUserSettingsHandler },
  { method: 'delete', path: '/user/account', handler: deleteAccountHandler },
  { method: 'get', path: '/user/export', handler: exportDataHandler },
];

export const registerUserRoutes = (
  router: express.Router,
  apiVersion: string,
  runHandler: RouteRunner,
) => {
  registerRouteDefinitions(router, apiVersion, runHandler, USER_ROUTES);
};
