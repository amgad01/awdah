import express from 'express';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

export type LocalHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;

export type RouteMethod = 'get' | 'post' | 'put' | 'delete';

export interface RouteDefinition {
  method: RouteMethod;
  path: string;
  handler: LocalHandler;
}

export type RouteRunner = (
  handler: LocalHandler,
  req: express.Request,
  res: express.Response,
) => Promise<void>;

export function registerRouteDefinitions(
  router: express.Router,
  apiVersion: string,
  runHandler: RouteRunner,
  definitions: RouteDefinition[],
): void {
  for (const definition of definitions) {
    registerRouteDefinition(router, apiVersion, runHandler, definition);
  }
}

function registerRouteDefinition(
  router: express.Router,
  apiVersion: string,
  runHandler: RouteRunner,
  definition: RouteDefinition,
): void {
  const { method, path, handler } = definition;

  router[method](`${apiVersion}${path}`, function localRouteHandler(req, res) {
    void runHandler(handler, req, res);
  });
}
