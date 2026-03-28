export interface DeletedUserRecord {
  userId: string;
  deletedAt: string;
}

export interface IDeletedUsersRepository {
  recordDeletion(userId: string, deletedAt: string): Promise<void>;
  listAll(): Promise<DeletedUserRecord[]>;
  deleteOlderThan(cutoffIso: string): Promise<number>;
}
