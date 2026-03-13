export const CONTEXTS = {
  USER: 'UserContext',
  SALAH: 'SalahContext',
  SAWM: 'SawmContext',
  SHARED: 'SharedContext',
} as const;

export type ContextName = (typeof CONTEXTS)[keyof typeof CONTEXTS];
