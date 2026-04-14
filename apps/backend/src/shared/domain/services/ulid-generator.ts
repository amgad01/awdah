import { ulid } from 'ulid';
import { IIdGenerator } from './id-generator.interface';

export class UlidGenerator implements IIdGenerator {
  generate(): string {
    return ulid();
  }
}
