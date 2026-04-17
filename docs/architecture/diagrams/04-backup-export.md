# Scheduled Backup Export

This diagram is for disaster-recovery plumbing and scheduled asynchronous work.

## ASCII

```text
EventBridge daily rule
  -> BackupExportFn
  -> DynamoDB ExportTableToPointInTime for selected tables
  -> S3 backup bucket
  -> Glacier transition after 30 days
  -> expiration after 90 days
  -> failures land in Backup DLQ
```

## Mermaid

```mermaid
flowchart LR
    EV[EventBridge daily rule] --> BF[BackupExportFn]
    BF --> PT[ExportTableToPointInTime]
    PT --> S3[(S3 backup bucket)]
    S3 --> GL[Glacier transition after 30 days]
    S3 --> EX[Expire after 90 days]
    BF -. failure .-> DLQ[Backup DLQ]
```

## Why It Exists

- the export path is operational, not user-driven
- DynamoDB point-in-time export avoids scanning tables through the live API
- the DLQ gives an operational signal when scheduled protection fails
