import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IFastLogRepository } from '../../../contexts/sawm/domain/repositories/fast-log.repository';
import { FastLog } from '../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';
import { LogType } from '../../../contexts/salah/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository } from './base-dynamodb.repository';

export class DynamoDBFastLogRepository
    extends BaseDynamoDBRepository<FastLog>
    implements IFastLogRepository {
    constructor(client: DynamoDBClient) {
        super(DynamoDBDocumentClient.from(client), settings.tables.fastLogs);
    }

    async save(log: FastLog): Promise<void> {
        const command = new PutCommand({
            TableName: this.tableName,
            Item: {
                userId: log.userId,
                sk: log.date.toString(),
                type: log.type.getValue(),
                loggedAt: log.loggedAt.toISOString(),
                typeDate: `${log.type.getValue()}#${log.date.toString()}`,
            },
        });

        await this.docClient.send(command);
    }

    async findByUserAndDateRange(
        userId: string,
        start: HijriDate,
        end: HijriDate,
    ): Promise<FastLog[]> {
        const items = await this.queryByPartitionKey(userId, {
            skBetween: {
                start: start.toString(),
                end: end.toString(),
            },
        });
        return items.map((item) => this.mapToDomain(item));
    }

    async countQadaaCompleted(userId: string): Promise<number> {
        return this.countByGSI(userId, 'GSI1', 'qadaa#');
    }

    protected mapToDomain(item: Record<string, unknown>): FastLog {
        const sk = (item.sk as string) || '';
        if (!sk) {
            throw new Error('Malformed fast log: missing SK');
        }
        return new FastLog({
            userId: (item.userId as string) || 'unknown',
            date: HijriDate.fromString(sk),
            type: new LogType((item.type as string) || 'unknown'),
            loggedAt: new Date((item.loggedAt as string) || new Date().toISOString()),
        });
    }
}
