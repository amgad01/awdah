declare module '*.mjs' {
  export function resolveDistDir(scriptUrl?: string): string;
  export function runBundleBudgetCheck(): void;
}
