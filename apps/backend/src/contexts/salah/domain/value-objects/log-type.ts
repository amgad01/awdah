import { ValidationError } from '@awdah/shared';
import { LOG_TYPES, LogType as LogTypeT } from '@awdah/shared';

export class LogType {
  private readonly value: LogTypeT;

  constructor(value: string) {
    if (!LOG_TYPES.includes(value as LogTypeT)) {
      throw new ValidationError(`Invalid log type: ${value}`);
    }
    this.value = value as LogTypeT;
  }

  getValue(): LogTypeT {
    return this.value;
  }

  isQadaa(): boolean {
    return this.value === 'qadaa';
  }

  isObligatory(): boolean {
    return this.value === 'obligatory';
  }

  equals(other: LogType): boolean {
    return this.value === other.value;
  }
}
