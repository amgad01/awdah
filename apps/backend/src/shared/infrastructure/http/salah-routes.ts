import express from 'express';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { handler as logPrayerHandler } from '../../../contexts/salah/infrastructure/handlers/log-prayer.handler';
import { handler as getSalahDebtHandler } from '../../../contexts/salah/infrastructure/handlers/get-salah-debt.handler';
import { handler as getPrayerHistoryHandler } from '../../../contexts/salah/infrastructure/handlers/get-prayer-history.handler';
import { handler as addPracticingPeriodHandler } from '../../../contexts/salah/infrastructure/handlers/add-practicing-period.handler';
import { handler as getPracticingPeriodsHandler } from '../../../contexts/salah/infrastructure/handlers/get-practicing-periods.handler';
import { handler as deletePracticingPeriodHandler } from '../../../contexts/salah/infrastructure/handlers/delete-practicing-period.handler';
import { handler as deletePrayerLogHandler } from '../../../contexts/salah/infrastructure/handlers/delete-prayer-log.handler';

export const registerSalahRoutes = (
  router: express.Router,
  apiVersion: string,
  runHandler: (
    handler: (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>,
    req: express.Request,
    res: express.Response,
  ) => Promise<void>,
) => {
  router.post(`${apiVersion}/salah/log`, (req, res) => runHandler(logPrayerHandler, req, res));
  router.delete(`${apiVersion}/salah/log`, (req, res) =>
    runHandler(deletePrayerLogHandler, req, res),
  );
  router.get(`${apiVersion}/salah/debt`, (req, res) => runHandler(getSalahDebtHandler, req, res));
  router.get(`${apiVersion}/salah/history`, (req, res) =>
    runHandler(getPrayerHistoryHandler, req, res),
  );
  router.post(`${apiVersion}/salah/practicing-period`, (req, res) =>
    runHandler(addPracticingPeriodHandler, req, res),
  );
  router.get(`${apiVersion}/salah/practicing-periods`, (req, res) =>
    runHandler(getPracticingPeriodsHandler, req, res),
  );
  router.delete(`${apiVersion}/salah/practicing-period`, (req, res) =>
    runHandler(deletePracticingPeriodHandler, req, res),
  );
};
