import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE_CODE, getInitialLanguageCode, loadLanguageBundle } from './languages';

type TranslationResources = Record<string, { translation: Record<string, unknown> }>;

let initializationPromise: Promise<typeof i18n> | null = null;

function syncDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = i18n.dir(language);
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
}

async function buildInitialResources(initialLanguage: string): Promise<TranslationResources> {
  const resources: TranslationResources = {
    [DEFAULT_LANGUAGE_CODE]: {
      translation: await loadLanguageBundle(DEFAULT_LANGUAGE_CODE),
    },
  };

  if (initialLanguage !== DEFAULT_LANGUAGE_CODE) {
    resources[initialLanguage] = {
      translation: await loadLanguageBundle(initialLanguage),
    };
  }

  return resources;
}

export async function initializeI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return i18n;
  }

  if (initializationPromise != null) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const initialLanguage = getInitialLanguageCode();
      const resources = await buildInitialResources(initialLanguage);

      await i18n.use(initReactI18next).init({
        resources,
        lng: initialLanguage,
        fallbackLng: DEFAULT_LANGUAGE_CODE,
        interpolation: {
          escapeValue: false,
        },
      });

      syncDocumentLanguage(initialLanguage);
      i18n.on('languageChanged', syncDocumentLanguage);

      return i18n;
    } catch (error) {
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

export default i18n;
