# Authenticated Request Path

this diagram is for the normal synchronous path, for example logging a prayer or fetching a debt summary.

## ASCII

```text
User action
  -> React SPA builds authenticated request
  -> API Gateway validates JWT and matches route
  -> Lambda handler parses input and resolves user context
  -> application use case runs business rules
  -> repository persists or reads data in DynamoDB
  -> JSON response returns to the SPA
```

## Mermaid

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant H as Lambda handler
    participant UC as Use case
    participant DB as DynamoDB

    U->>FE: Log prayer
    FE->>API: POST /v1/salah/log
    API->>H: Authorized request
    H->>UC: Validate + execute
    UC->>DB: Persist prayer event
    DB-->>UC: OK
    UC-->>H: Result
    H-->>FE: JSON response
```

## What Matters

- handler code should stay thin
- business validation belongs in the use-case layer, where it is reusable and testable
- the frontend improves UX, but the backend remains authoritative
