export function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
}

export function requireArgValue(args: string[], flag: string): string {
  const value = getArgValue(args, flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}
