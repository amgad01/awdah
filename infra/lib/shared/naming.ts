import { Construct } from 'constructs';

/**
 * standard utility to get the common ticket prefix from context.
 * Format: ticket- (or empty string)
 */
export function getResourcePrefix(scope: Construct): string {
  const ticket = scope.node.tryGetContext('ticket');
  return ticket ? `${ticket}-` : '';
}

/**
 * Standard utility to generate resource names following the project's convention.
 * Format: [ticket-]Awdah-[name]-[env]
 *
 * This resolves context directly from the construct node, avoiding the need
 * for prop-drilling or type casting to BaseStack.
 */
export function getFullResourceName(scope: Construct, name: string, projectEnv: string): string {
  return `${getResourcePrefix(scope)}Awdah-${name}-${projectEnv}`;
}
