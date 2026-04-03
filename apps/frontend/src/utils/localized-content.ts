type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue;
}

interface LoadLocalizedContentOptions {
  baseUrl?: string;
  fallbackLanguage?: string;
  signal?: AbortSignal;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isJsonObject(value: unknown): value is JsonObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function mergeWithFallback<T>(localized: T, fallback: T): T {
  if (localized == null) {
    return fallback;
  }

  if (fallback == null) {
    return localized;
  }

  if (Array.isArray(localized) && Array.isArray(fallback)) {
    const maxLength = Math.max(localized.length, fallback.length);

    return Array.from({ length: maxLength }, (_, index) => {
      const localizedValue = localized[index];
      const fallbackValue = fallback[index];

      if (localizedValue == null) {
        return fallbackValue;
      }

      if (fallbackValue == null) {
        return localizedValue;
      }

      if (Array.isArray(localizedValue) && Array.isArray(fallbackValue)) {
        return mergeWithFallback(localizedValue, fallbackValue);
      }

      if (isJsonObject(localizedValue) && isJsonObject(fallbackValue)) {
        return mergeWithFallback(localizedValue, fallbackValue);
      }

      return localizedValue;
    }) as T;
  }

  if (isJsonObject(localized) && isJsonObject(fallback)) {
    const fallbackObject = fallback as Record<string, JsonValue>;
    const localizedObject = localized as Record<string, JsonValue>;
    const merged: Record<string, JsonValue> = { ...fallbackObject };

    for (const [key, localizedValue] of Object.entries(localizedObject)) {
      const fallbackValue = fallbackObject[key];

      if (localizedValue == null) {
        merged[key] = fallbackValue;
        continue;
      }

      if (Array.isArray(localizedValue) && Array.isArray(fallbackValue)) {
        merged[key] = mergeWithFallback(localizedValue, fallbackValue);
        continue;
      }

      if (isJsonObject(localizedValue) && isJsonObject(fallbackValue)) {
        merged[key] = mergeWithFallback(localizedValue, fallbackValue);
        continue;
      }

      merged[key] = localizedValue;
    }

    return merged as T;
  }

  return localized;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed to load localized content from ${url}`);
  }

  return (await response.json()) as T;
}

export async function loadLocalizedContent<T>(
  contentName: string,
  language: string,
  {
    baseUrl = import.meta.env.BASE_URL,
    fallbackLanguage = 'en',
    signal,
  }: LoadLocalizedContentOptions = {},
): Promise<T> {
  const fallbackUrl = `${baseUrl}data/${contentName}-${fallbackLanguage}.json`;
  const fallbackContent = await fetchJson<T>(fallbackUrl, signal);

  if (language === fallbackLanguage) {
    return fallbackContent;
  }

  const localizedUrl = `${baseUrl}data/${contentName}-${language}.json`;

  try {
    const localizedContent = await fetchJson<T>(localizedUrl, signal);
    return mergeWithFallback(localizedContent, fallbackContent);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return fallbackContent;
  }
}
