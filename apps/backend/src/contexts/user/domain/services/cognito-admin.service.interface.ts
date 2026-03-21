/**
 * Port (domain interface) for Cognito user management.
 * The infrastructure layer provides the concrete implementation.
 */
export interface ICognitoAdminService {
  /**
   * Permanently deletes the Cognito user account identified by their sub UUID.
   * Called after all DynamoDB data has been deleted.
   */
  deleteUser(userId: string): Promise<void>;
}
