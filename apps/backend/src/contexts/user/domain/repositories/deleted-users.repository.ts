import { UserId } from '@awdah/shared';

export interface DeletedUserRecord {
  userId: UserId;
  deletedAt: string;
  expiresAt: number;
}

export interface IDeletedUsersRepository {
  recordDeletion(userId: UserId, deletedAt: string, expiresAt: number): Promise<void>;
  listAll(): Promise<DeletedUserRecord[]>;
}
