export type LocalizedText = Partial<Record<string, string>>;

export interface ReferenceLink {
  label: string;
  url: string;
  verified?: boolean;
}

export interface LocalizedReferenceLink {
  label: LocalizedText;
  url: string;
  verified?: boolean;
}

export function resolveLocalizedText(field: LocalizedText, language: string): string | undefined {
  return field[language] ?? field.en;
}

export function resolveReferenceLinks(
  references: LocalizedReferenceLink[] | undefined,
  language: string,
): ReferenceLink[] {
  if (!references?.length) {
    return [];
  }

  return references.flatMap((reference) => {
    if (reference.verified === false) {
      return [];
    }

    const label = resolveLocalizedText(reference.label, language);

    if (!label) {
      return [];
    }

    return [
      {
        label,
        url: reference.url,
        verified: reference.verified,
      },
    ];
  });
}
