# User Lifecycle Job Flow

Use this diagram for heavy or destructive operations such as export, reset, and account deletion.

## ASCII

```text
Frontend starts delete / reset / export
  -> API handler creates pending lifecycle job in UserLifecycleJobs
  -> API returns 202 Accepted with job id
  -> DynamoDB stream on UserLifecycleJobs emits INSERT / NEW_IMAGE
  -> ProcessUserLifecycleJobFn claims the pending job
  -> worker runs one branch:
     - export: read data, store export chunks, mark completed
     - reset: delete one log family, mark completed
     - delete-account: delete app data, write DeletedUsers tombstone, mark completed with auth cleanup pending
  -> frontend polls GET /v1/user/jobs/status?jobId=...
  -> frontend performs the final user-facing step:
     - GET /v1/user/export?jobId=...
     - or DELETE /v1/user/account/auth?jobId=...
     - or just refresh/reset UI state
```

## Mermaid

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Start handler
    participant JOB as UserLifecycleJobs
    participant W as ProcessUserLifecycleJobFn
    participant DATA as User data services
    participant FINAL as Status / download / finalize route

    FE->>API: Start export / reset / delete
    API->>JOB: create pending job
    API-->>FE: 202 Accepted + jobId
    JOB-->>W: DynamoDB stream INSERT / NEW_IMAGE
    W->>JOB: tryMarkProcessing()
    alt export
        W->>DATA: export user data
        W->>JOB: save export chunks + mark completed
        loop poll status
            FE->>FINAL: GET /v1/user/jobs/status?jobId=...
            FINAL-->>FE: pending / processing / completed
        end
        FE->>FINAL: GET /v1/user/export?jobId=...
        FINAL-->>FE: export payload
    else reset-prayers / reset-fasts
        W->>DATA: delete one log family
        W->>JOB: mark completed
        loop poll status
            FE->>FINAL: GET /v1/user/jobs/status?jobId=...
            FINAL-->>FE: pending / processing / completed
        end
        FE-->>FE: refresh queries / show success toast
    else delete-account
        W->>DATA: delete user-managed data
        W->>JOB: write tombstone + mark completed authDeleted=false
        loop poll status
            FE->>FINAL: GET /v1/user/jobs/status?jobId=...
            FINAL-->>FE: pending / processing / completed
        end
        FE->>FINAL: DELETE /v1/user/account/auth?jobId=...
        FINAL-->>FE: authDeleted=true/false
        FE-->>FE: sign out
    else worker failure
        W->>JOB: mark failed
        loop poll status
            FE->>FINAL: GET /v1/user/jobs/status?jobId=...
            FINAL-->>FE: failed
        end
    end
```

## Local Dev Note

In LocalStack-style development, the repo uses an in-process dispatcher instead of waiting for the DynamoDB stream path. The state model stays the same, but the trigger mechanism is simplified for local work.

Important detail:
the DynamoDB stream triggers the worker path, not the delete-account finalization route. `DELETE /v1/user/account/auth` is a separate authenticated API call from the frontend after the delete job completes.
