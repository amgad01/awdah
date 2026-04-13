import publicRoutesManifest from '../../config/public-routes.json';

export interface PublicRouteDefinition {
  id: string;
  path: string;
  title: string;
  description: string;
  changefreq: string;
  priority: number;
}

const manifest = publicRoutesManifest as PublicRouteDefinition[];

export const PUBLIC_ROUTE_DEFINITIONS = manifest;

export const PUBLIC_ROUTE_PATHS = Object.freeze(
  manifest.reduce<Record<string, string>>((paths, route) => {
    paths[route.id] = route.path;
    return paths;
  }, {}),
);

export function getPublicRouteById(routeId: string): PublicRouteDefinition {
  const route = manifest.find((entry) => entry.id === routeId);

  if (!route) {
    throw new Error(`Unknown public route: ${routeId}`);
  }

  return route;
}
