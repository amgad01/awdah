import express from 'express';
import { handler as logPrayerHandler } from '../../../contexts/salah/infrastructure/handlers/log-prayer.handler';
import { handler as getSalahDebtHandler } from '../../../contexts/salah/infrastructure/handlers/get-salah-debt.handler';
import { handler as getPrayerHistoryHandler } from '../../../contexts/salah/infrastructure/handlers/get-prayer-history.handler';
import { handler as getPrayerHistoryPageHandler } from '../../../contexts/salah/infrastructure/handlers/get-prayer-history-page.handler';
import { handler as addPracticingPeriodHandler } from '../../../contexts/salah/infrastructure/handlers/add-practicing-period.handler';
import { handler as updatePracticingPeriodHandler } from '../../../contexts/salah/infrastructure/handlers/update-practicing-period.handler';
import { handler as getPracticingPeriodsHandler } from '../../../contexts/salah/infrastructure/handlers/get-practicing-periods.handler';
import { handler as deletePracticingPeriodHandler } from '../../../contexts/salah/infrastructure/handlers/delete-practicing-period.handler';
import { handler as deletePrayerLogHandler } from '../../../contexts/salah/infrastructure/handlers/delete-prayer-log.handler';
import { handler as resetPrayerLogsHandler } from '../../../contexts/salah/infrastructure/handlers/reset-prayer-logs.handler';
import { registerRouteDefinitions, type RouteDefinition, type RouteRunner } from './route-registry';

const SALAH_ROUTES: RouteDefinition[] = [
  { method: 'post', path: '/salah/log', handler: logPrayerHandler },
  { method: 'delete', path: '/salah/log', handler: deletePrayerLogHandler },
  { method: 'delete', path: '/salah/logs', handler: resetPrayerLogsHandler },
  { method: 'get', path: '/salah/debt', handler: getSalahDebtHandler },
  { method: 'get', path: '/salah/history', handler: getPrayerHistoryHandler },
  { method: 'get', path: '/salah/history/page', handler: getPrayerHistoryPageHandler },
  { method: 'post', path: '/salah/practicing-period', handler: addPracticingPeriodHandler },
  { method: 'put', path: '/salah/practicing-period', handler: updatePracticingPeriodHandler },
  { method: 'get', path: '/salah/practicing-periods', handler: getPracticingPeriodsHandler },
  { method: 'delete', path: '/salah/practicing-period', handler: deletePracticingPeriodHandler },
];

export function registerSalahRoutes(
  router: express.Router,
  apiVersion: string,
  runHandler: RouteRunner,
) {
  registerRouteDefinitions(router, apiVersion, runHandler, SALAH_ROUTES);
}
