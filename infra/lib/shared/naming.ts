import { Construct } from 'constructs';

/**
 * Standard utility to generate resource names following the project's convention.
 * Format: [ticket-]Awdah-[name]-[env]
 *
 * This resolves context directly from the construct node, avoiding the need
 * for prop-drilling or type casting to BaseStack.
 */
export function getFullResourceName(scope: Construct, name: string, projectEnv: string): string {
  const ticket = scope.node.tryGetContext('ticket');
  const prefix = ticket ? `${ticket}-` : '';

  return `${prefix}Awdah-${name}-${projectEnv}`;
}
