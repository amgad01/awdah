import { DynamoDBClient, ExportTableToPointInTimeCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../middleware/logger';
import { createAwsClientConfig } from '../aws/client-config';

const dynamo = new DynamoDBClient(createAwsClientConfig());

export async function handler(): Promise<void> {
  const logger = createLogger('BackupExport');
  const tableArns = (process.env.TABLE_ARNS || '').split(',').filter(Boolean);
  const s3Bucket = process.env.BACKUP_BUCKET;

  if (!s3Bucket) throw new Error('BACKUP_BUCKET environment variable is not set');
  if (tableArns.length === 0) throw new Error('TABLE_ARNS environment variable is not set');

  const datePrefix = new Date().toISOString().split('T')[0];

  const results = await Promise.allSettled(
    tableArns.map(async (tableArn) => {
      const tableName = tableArn.split('/').pop() || tableArn;
      logger.info({ tableName, s3Bucket }, 'Starting DynamoDB export');

      const { ExportDescription: desc } = await dynamo.send(
        new ExportTableToPointInTimeCommand({
          TableArn: tableArn,
          S3Bucket: s3Bucket,
          S3Prefix: `exports/${datePrefix}/${tableName}`,
          ExportFormat: 'DYNAMODB_JSON',
        }),
      );

      logger.info(
        { tableName, exportArn: desc?.ExportArn, status: desc?.ExportStatus },
        'Export initiated',
      );
      return { tableName, exportArn: desc?.ExportArn };
    }),
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled');
  const failed = results.filter((r) => r.status === 'rejected');

  if (failed.length > 0) {
    for (const result of failed) {
      if (result.status === 'rejected') {
        logger.error({ reason: result.reason }, 'Export initiation failed for a table');
      }
    }
  }

  logger.info(
    {
      tableCount: tableArns.length,
      succeeded: succeeded.length,
      failed: failed.length,
      exportArns: succeeded.map((r) => (r.status === 'fulfilled' ? r.value.exportArn : null)),
    },
    'Backup export run complete',
  );

  if (failed.length > 0) {
    throw new Error(`${failed.length} of ${tableArns.length} table exports failed to initiate`);
  }
}
