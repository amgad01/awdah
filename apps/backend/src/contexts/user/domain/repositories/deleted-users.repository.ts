export interface DeletedUserRecord {
  userId: string;
  deletedAt: string;
  expiresAt: number;
}

export interface IDeletedUsersRepository {
  recordDeletion(userId: string, deletedAt: string, expiresAt: number): Promise<void>;
  listAll(): Promise<DeletedUserRecord[]>;
}
