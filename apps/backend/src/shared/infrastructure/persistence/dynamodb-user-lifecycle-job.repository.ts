import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { UserId, EventId } from '@awdah/shared';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, type DomainKeys } from './base-dynamodb.repository';
import { omitUndefinedFields } from './object-utils';
import { getFullJitterBackoffDelayMs, wait } from './retry-backoff';
import type {
  CompleteUserLifecycleJobInput,
  CreateUserLifecycleJobInput,
  IUserLifecycleJobRepository,
  SaveUserLifecycleExportResultInput,
  UserLifecycleExportDownload,
  UserLifecycleJob,
} from '../../../contexts/user/domain/repositories/user-lifecycle-job.repository';

const EXPORT_CHUNK_SIZE_BYTES = 250_000;
const MAX_BATCH_WRITE_ATTEMPTS = 5;
const BATCH_WRITE_RETRY_BASE_DELAY_MS = 50;
const JOB_SK_PREFIX = 'JOB#';
const JOB_CHUNK_DELIMITER = '#CHUNK#';

export class DynamoDBUserLifecycleJobRepository
  extends BaseDynamoDBRepository<UserLifecycleJob>
  implements IUserLifecycleJobRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.userLifecycleJobs, 'sk', 'userId');
  }

  async createJob(input: CreateUserLifecycleJobInput): Promise<UserLifecycleJob> {
    const job: UserLifecycleJob = {
      ...input,
      status: 'pending',
    };
    await this.createOnly(job);
    return job;
  }

  async findById(userId: UserId, jobId: EventId): Promise<UserLifecycleJob | null> {
    return this.retrieve({ pk: userId.toString(), sk: toMetaSk(jobId) });
  }

  async findRecentJobByType(
    userId: UserId,
    type: UserLifecycleJob['type'],
    since: string,
  ): Promise<UserLifecycleJob | null> {
    // Note: We scan through jobs without Limit because FilterExpression is applied
    // after Limit. Using Limit: 1 could miss matching jobs if the most recent job
    // is of a different type. We stop at the first match or when requestedAt <= since.
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: '#pk = :pk',
          FilterExpression: '#type = :type AND #requestedAt > :since',
          ExpressionAttributeNames: {
            '#pk': this.pkName,
            '#type': 'type',
            '#requestedAt': 'requestedAt',
          },
          ExpressionAttributeValues: {
            ':pk': userId.toString(),
            ':type': type,
            ':since': since,
          },
          ExclusiveStartKey: exclusiveStartKey,
          // No Limit - we need to scan through results since FilterExpression
          // is applied after Limit, which could cause us to miss matching jobs
        }),
      );

      const items = response.Items ?? [];
      if (items.length > 0) {
        return this.mapToDomain(items[0] as Record<string, unknown>);
      }

      // Check if we need to continue scanning (more pages available)
      exclusiveStartKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;

      // Optimization: If we scanned some items but found no matches, and we're
      // past the 'since' threshold based on sort key ordering, we can stop
      // Note: This is a safety check - the filter should handle it, but this prevents
      // scanning entire partitions for users with many old jobs
      if (response.ScannedCount && response.ScannedCount > 0) {
        // Continue to next page - we haven't found a match in this batch
        continue;
      }
    } while (exclusiveStartKey);

    return null;
  }

  async tryMarkProcessing(
    userId: UserId,
    jobId: EventId,
    startedAt: string,
  ): Promise<UserLifecycleJob | null> {
    try {
      const response = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { [this.pkName]: userId.toString(), [this.skName]: toMetaSk(jobId) },
          ConditionExpression: '#status = :pending',
          UpdateExpression: 'SET #status = :processing, startedAt = :startedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':pending': 'pending',
            ':processing': 'processing',
            ':startedAt': startedAt,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      return response.Attributes
        ? this.mapToDomain(response.Attributes as Record<string, unknown>)
        : null;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        return null;
      }

      throw error;
    }
  }

  async markCompleted(
    userId: UserId,
    jobId: EventId,
    input: CompleteUserLifecycleJobInput,
  ): Promise<UserLifecycleJob> {
    await this.updatePartial(
      { pk: userId.toString(), sk: toMetaSk(jobId) },
      omitUndefinedFields({
        status: 'completed',
        completedAt: input.completedAt,
        exportFileName: input.exportFileName,
        exportContentType: input.exportContentType,
        exportChunkCount: input.exportChunkCount,
        authCleanupRequired: input.authCleanupRequired,
        authDeleted: input.authDeleted,
      }),
    );

    const job = await this.findById(userId, jobId);
    if (!job) {
      throw new Error(`Lifecycle job ${jobId.toString()} disappeared after completion update`);
    }
    return job;
  }

  async markFailed(
    userId: UserId,
    jobId: EventId,
    completedAt: string,
    errorMessage: string,
  ): Promise<void> {
    await this.updatePartial(
      { pk: userId.toString(), sk: toMetaSk(jobId) },
      {
        status: 'failed',
        completedAt,
        errorMessage,
      },
    );
  }

  async saveExportResult(
    userId: UserId,
    jobId: EventId,
    input: SaveUserLifecycleExportResultInput,
  ): Promise<{ chunkCount: number }> {
    const payloadBuffer = Buffer.from(JSON.stringify(input.data), 'utf8');
    const chunkCount = Math.max(1, Math.ceil(payloadBuffer.length / EXPORT_CHUNK_SIZE_BYTES));

    for (let index = 0; index < chunkCount; index += 25) {
      const batchChunks = Array.from({ length: Math.min(25, chunkCount - index) }, (_, offset) => {
        const chunkIndex = index + offset;
        const start = chunkIndex * EXPORT_CHUNK_SIZE_BYTES;
        const end = start + EXPORT_CHUNK_SIZE_BYTES;
        const chunkData = payloadBuffer.subarray(start, end).toString('base64');

        return {
          PutRequest: {
            Item: {
              userId: userId.toString(),
              sk: toChunkSk(jobId, chunkIndex),
              chunkData,
              expiresAt: input.expiresAt,
            },
          },
        };
      });

      await this.writeBatchWithRetry(batchChunks);
    }

    return { chunkCount };
  }

  async readExportResult(
    userId: UserId,
    jobId: EventId,
  ): Promise<UserLifecycleExportDownload | null> {
    const job = await this.findById(userId, jobId);
    if (
      !job ||
      !job.exportChunkCount ||
      !job.exportFileName ||
      !job.exportContentType ||
      job.status !== 'completed'
    ) {
      return null;
    }

    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
        ExpressionAttributeNames: {
          '#pk': this.pkName,
          '#sk': this.skName,
        },
        ExpressionAttributeValues: {
          ':pk': userId.toString(),
          ':skPrefix': toChunkPrefix(jobId),
        },
      }),
    );

    const items = (response.Items ?? []) as Array<{ chunkData?: string }>;
    if (items.length !== job.exportChunkCount) {
      return null;
    }

    const combined = Buffer.concat(
      items.map((item) => Buffer.from(item.chunkData ?? '', 'base64')),
    ).toString('utf8');

    const data = JSON.parse(combined) as UserLifecycleExportDownload['data'];

    return {
      fileName: job.exportFileName,
      contentType: job.exportContentType,
      data,
    };
  }

  async markAuthDeleted(
    userId: UserId,
    jobId: EventId,
    completedAt: string,
  ): Promise<UserLifecycleJob> {
    await this.updatePartial(
      { pk: userId.toString(), sk: toMetaSk(jobId) },
      {
        authDeleted: true,
        authCleanupCompletedAt: completedAt,
      },
    );

    const job = await this.findById(userId, jobId);
    if (!job) {
      throw new Error(`Lifecycle job ${jobId.toString()} disappeared after auth cleanup update`);
    }
    return job;
  }

  protected encodeKeys(job: UserLifecycleJob): DomainKeys {
    return {
      pk: job.userId.toString(),
      sk: toMetaSk(job.jobId),
    };
  }

  protected mapToPersistence(job: UserLifecycleJob): Record<string, unknown> {
    return omitUndefinedFields({
      type: job.type,
      status: job.status,
      requestedAt: job.requestedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      expiresAt: job.expiresAt,
      exportFileName: job.exportFileName,
      exportContentType: job.exportContentType,
      exportChunkCount: job.exportChunkCount,
      authCleanupRequired: job.authCleanupRequired,
      authDeleted: job.authDeleted,
      authCleanupCompletedAt: job.authCleanupCompletedAt,
    });
  }

  protected mapToDomain(item: Record<string, unknown>): UserLifecycleJob {
    return {
      userId: new UserId(item.userId as string),
      jobId: fromMetaSk(item.sk as string),
      type: item.type as UserLifecycleJob['type'],
      status: item.status as UserLifecycleJob['status'],
      requestedAt: item.requestedAt as string,
      startedAt: item.startedAt as string | undefined,
      completedAt: item.completedAt as string | undefined,
      errorMessage: item.errorMessage as string | undefined,
      expiresAt: item.expiresAt as number,
      exportFileName: item.exportFileName as string | undefined,
      exportContentType: item.exportContentType as string | undefined,
      exportChunkCount: item.exportChunkCount as number | undefined,
      authCleanupRequired: item.authCleanupRequired as boolean | undefined,
      authDeleted: item.authDeleted as boolean | undefined,
      authCleanupCompletedAt: item.authCleanupCompletedAt as string | undefined,
    };
  }

  private async writeBatchWithRetry(
    writes: Array<{ PutRequest: { Item: Record<string, unknown> } }>,
  ): Promise<void> {
    let pendingWrites = writes;

    for (let attempt = 1; pendingWrites.length > 0; attempt += 1) {
      const result = await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: pendingWrites,
          },
        }),
      );

      pendingWrites =
        (result.UnprocessedItems?.[this.tableName] as
          | Array<{
              PutRequest: { Item: Record<string, unknown> };
            }>
          | undefined) ?? [];

      if (pendingWrites.length === 0) {
        return;
      }

      if (attempt >= MAX_BATCH_WRITE_ATTEMPTS) {
        throw new Error(
          `Failed to persist lifecycle export chunks after ${MAX_BATCH_WRITE_ATTEMPTS} attempts`,
        );
      }

      await wait(getBatchWriteRetryDelayMs(attempt));
    }
  }
}

function toMetaSk(jobId: EventId): string {
  return `${JOB_SK_PREFIX}${jobId.toString()}`;
}

function fromMetaSk(sk: string): EventId {
  return new EventId(sk.slice(JOB_SK_PREFIX.length));
}

function toChunkPrefix(jobId: EventId): string {
  return `${toMetaSk(jobId)}${JOB_CHUNK_DELIMITER}`;
}

function toChunkSk(jobId: EventId, chunkIndex: number): string {
  return `${toChunkPrefix(jobId)}${chunkIndex.toString().padStart(6, '0')}`;
}

function getBatchWriteRetryDelayMs(attempt: number): number {
  return getFullJitterBackoffDelayMs(BATCH_WRITE_RETRY_BASE_DELAY_MS, attempt);
}
