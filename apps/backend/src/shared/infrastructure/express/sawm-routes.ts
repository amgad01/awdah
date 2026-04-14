import express from 'express';
import { handler as logFastHandler } from '../../../contexts/sawm/infrastructure/handlers/log-fast.handler';
import { handler as getSawmDebtHandler } from '../../../contexts/sawm/infrastructure/handlers/get-sawm-debt.handler';
import { handler as getFastHistoryHandler } from '../../../contexts/sawm/infrastructure/handlers/get-fast-history.handler';
import { handler as getFastHistoryPageHandler } from '../../../contexts/sawm/infrastructure/handlers/get-fast-history-page.handler';
import { handler as deleteFastLogHandler } from '../../../contexts/sawm/infrastructure/handlers/delete-fast-log.handler';
import { handler as resetFastLogsHandler } from '../../../contexts/sawm/infrastructure/handlers/reset-fast-logs.handler';
import { registerRouteDefinitions, type RouteDefinition, type RouteRunner } from './route-registry';

const SAWM_ROUTES: RouteDefinition[] = [
  { method: 'post', path: '/sawm/log', handler: logFastHandler },
  { method: 'delete', path: '/sawm/log', handler: deleteFastLogHandler },
  { method: 'delete', path: '/sawm/logs', handler: resetFastLogsHandler },
  { method: 'get', path: '/sawm/debt', handler: getSawmDebtHandler },
  { method: 'get', path: '/sawm/history', handler: getFastHistoryHandler },
  { method: 'get', path: '/sawm/history/page', handler: getFastHistoryPageHandler },
];

export function registerSawmRoutes(
  router: express.Router,
  apiVersion: string,
  runHandler: RouteRunner,
) {
  registerRouteDefinitions(router, apiVersion, runHandler, SAWM_ROUTES);
}
