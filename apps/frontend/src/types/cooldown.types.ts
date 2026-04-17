/**
 * Shared cooldown types for lifecycle operations
 */

export interface CooldownController {
  isCoolingDown: boolean;
  secondsRemaining: number;
  canReset: boolean;
  recordAttempt: () => void;
  checkBeforeRequest: () => boolean;
}

export type ResetAction = 'prayers' | 'fasts' | 'export';
