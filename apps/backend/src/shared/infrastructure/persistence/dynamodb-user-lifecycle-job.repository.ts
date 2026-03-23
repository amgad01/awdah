import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, type DomainKeys } from './base-dynamodb.repository';
import type {
  CompleteUserLifecycleJobInput,
  CreateUserLifecycleJobInput,
  IUserLifecycleJobRepository,
  SaveUserLifecycleExportResultInput,
  UserLifecycleExportDownload,
  UserLifecycleJob,
} from '../../../contexts/user/domain/repositories/user-lifecycle-job.repository';
import type { UserDataExport } from '../../../contexts/user/domain/services/user-data-lifecycle.service.interface';

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

  async findById(userId: string, jobId: string): Promise<UserLifecycleJob | null> {
    return this.retrieve({ pk: userId, sk: toMetaSk(jobId) });
  }

  async tryMarkProcessing(
    userId: string,
    jobId: string,
    startedAt: string,
  ): Promise<UserLifecycleJob | null> {
    try {
      const response = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { [this.pkName]: userId, [this.skName]: toMetaSk(jobId) },
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
    userId: string,
    jobId: string,
    input: CompleteUserLifecycleJobInput,
  ): Promise<UserLifecycleJob> {
    await this.updatePartial(
      { pk: userId, sk: toMetaSk(jobId) },
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
      throw new Error(`Lifecycle job ${jobId} disappeared after completion update`);
    }
    return job;
  }

  async markFailed(
    userId: string,
    jobId: string,
    completedAt: string,
    errorMessage: string,
  ): Promise<void> {
    await this.updatePartial(
      { pk: userId, sk: toMetaSk(jobId) },
      {
        status: 'failed',
        completedAt,
        errorMessage,
      },
    );
  }

  async saveExportResult(
    userId: string,
    jobId: string,
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
              userId,
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
    userId: string,
    jobId: string,
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
          ':pk': userId,
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

    return {
      fileName: job.exportFileName,
      contentType: job.exportContentType,
      data: JSON.parse(combined) as UserDataExport,
    };
  }

  async markAuthDeleted(
    userId: string,
    jobId: string,
    completedAt: string,
  ): Promise<UserLifecycleJob> {
    await this.updatePartial(
      { pk: userId, sk: toMetaSk(jobId) },
      {
        authDeleted: true,
        authCleanupCompletedAt: completedAt,
      },
    );

    const job = await this.findById(userId, jobId);
    if (!job) {
      throw new Error(`Lifecycle job ${jobId} disappeared after auth cleanup update`);
    }
    return job;
  }

  protected encodeKeys(job: UserLifecycleJob): DomainKeys {
    return {
      pk: job.userId,
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
      userId: item.userId as string,
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

      await sleep(getBatchWriteRetryDelayMs(attempt));
    }
  }
}

function toMetaSk(jobId: string): string {
  return `${JOB_SK_PREFIX}${jobId}`;
}

function fromMetaSk(sk: string): string {
  return sk.slice(JOB_SK_PREFIX.length);
}

function toChunkPrefix(jobId: string): string {
  return `${toMetaSk(jobId)}${JOB_CHUNK_DELIMITER}`;
}

function toChunkSk(jobId: string, chunkIndex: number): string {
  return `${toChunkPrefix(jobId)}${chunkIndex.toString().padStart(6, '0')}`;
}

function omitUndefinedFields(item: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}

function getBatchWriteRetryDelayMs(attempt: number): number {
  const exponentialDelay = BATCH_WRITE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
  const halfDelay = Math.floor(exponentialDelay / 2);
  return halfDelay + Math.floor(Math.random() * Math.max(halfDelay, 1));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
