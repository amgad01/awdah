import { StringValueObject } from './base-value-object';
import { ValidationError } from '../../errors';

export class UserId extends StringValueObject {
  constructor(value: string) {
    super(value);
    this.validate();
  }

  private validate(): void {
    if (!this.value) {
      throw new ValidationError('UserId cannot be empty');
    }
  }
}
