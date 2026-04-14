export abstract class ValueObject<T> {
  protected constructor(protected readonly props: T) {}

  public equals(other: ValueObject<T> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

export abstract class StringValueObject extends ValueObject<string> {
  protected constructor(value: string) {
    super(value);
  }

  get value(): string {
    return this.props;
  }

  public toString(): string {
    return this.props;
  }

  public toJSON(): string {
    return this.props;
  }

  public equals(other: ValueObject<string> | null | undefined): boolean {
    if (!other) {
      return false;
    }
    if (other instanceof StringValueObject) {
      return this.props === other.props;
    }
    return super.equals(other);
  }
}
