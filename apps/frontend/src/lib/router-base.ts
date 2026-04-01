const DEFAULT_BASE_PATH = '/';
const DEFAULT_PAGES_BASE_PATH = '/awdah/';

export function normalizeRouterBase(basePath: string | undefined): string {
  if (!basePath) {
    return DEFAULT_BASE_PATH;
  }

  let normalized = basePath.trim();
  if (!normalized) {
    return DEFAULT_BASE_PATH;
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

interface ResolveRouterBaseOptions {
  configuredBasePath?: string;
  currentPathname?: string;
  pagesBasePath?: string;
}

export function resolveRouterBase({
  configuredBasePath = DEFAULT_BASE_PATH,
  currentPathname = DEFAULT_BASE_PATH,
  pagesBasePath = DEFAULT_PAGES_BASE_PATH,
}: ResolveRouterBaseOptions = {}): string {
  const normalizedConfiguredBase = normalizeRouterBase(configuredBasePath);

  if (normalizedConfiguredBase !== DEFAULT_BASE_PATH) {
    return normalizedConfiguredBase;
  }

  const normalizedPagesBase = normalizeRouterBase(pagesBasePath);
  const pagesPrefix = normalizedPagesBase.slice(0, -1);

  if (currentPathname === pagesPrefix || currentPathname.startsWith(`${pagesPrefix}/`)) {
    return normalizedPagesBase;
  }

  return normalizedConfiguredBase;
}
