import { DynamoDBClient, ExportTableToPointInTimeCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../middleware/logger';

const dynamo = new DynamoDBClient({});

export async function handler(): Promise<void> {
  const logger = createLogger('BackupExport', 'scheduled');
  const tableArns = (process.env.TABLE_ARNS || '').split(',').filter(Boolean);
  const s3Bucket = process.env.BACKUP_BUCKET;

  if (!s3Bucket) throw new Error('BACKUP_BUCKET environment variable is not set');
  if (tableArns.length === 0) throw new Error('TABLE_ARNS environment variable is not set');

  const datePrefix = new Date().toISOString().split('T')[0];

  for (const tableArn of tableArns) {
    const tableName = tableArn.split('/').pop() || tableArn;
    logger.info({ tableName, s3Bucket }, 'Starting DynamoDB export');

    await dynamo.send(
      new ExportTableToPointInTimeCommand({
        TableArn: tableArn,
        S3Bucket: s3Bucket,
        S3Prefix: `exports/${datePrefix}/${tableName}`,
        ExportFormat: 'DYNAMODB_JSON',
      }),
    );

    logger.info({ tableName }, 'Export initiated');
  }

  logger.info({ tableCount: tableArns.length }, 'All exports initiated');
}
