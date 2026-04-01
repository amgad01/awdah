# Architectural Overview

Awdah is a serverless application built around a modular monolith and clean architecture. This document summarizes the current design choices and the constraints they are meant to satisfy.

## Strategic Design: Modular Monolith

The codebase is organized as a **modular monolith** rather than a set of independently deployed services. That keeps the domain model and workflows easy to inspect in one repository while still allowing the infrastructure to be split into separate CDK stacks.

### Benefits

- **Lower cognitive overhead**: the domain, application, and infrastructure layers stay in one repo.
- **Cohesive bounded contexts**: Salah and Sawm each own their own use cases and persistence concerns.
- **Operational separation**: CDK stacks isolate data, auth, API, backup, alarms, and frontend deployment concerns.

---

## Technical Design: Layers & Decoupling

The project follows **Clean Architecture** and **Domain-Driven Design (DDD)**. This structure helps keep the "Core" of our application (business logic) isolated from "shell" details (cloud providers, frameworks, databases).

### 1. The Domain Layer

- **Entities**: Represent core concepts like `PrayerLog` and `User`.
- **Value Objects**: Immutable types (e.g., `Money`, `PrayerTime`) that encapsulate logic.
- **Business Rules**: Validations and logic that belong purely to the spiritual tracking domain.

### 2. The Application Layer

- **Use Cases**: Single-responsibility classes that execute a specific workflow (e.g., `LogPrayer`, `ResetFasts`).
- **Ports**: Interfaces defined for external interactions (e.g., `IPrayerRepository`).

### 3. The Infrastructure Layer

- **Adapters**: Concrete implementations of Ports. We use **DynamoDB** for storage, **Cognito** for authentication, and **SNS** for alerting.
- **AWS CDK**: Defines the infrastructure as code so environments are created consistently.

---

## Security & Reliability

### Data Protection

- **Encryption**: Data is encrypted by the managed AWS services used in the deployment, and deployed traffic is served over HTTPS. The codebase does not add a separate application-level encryption layer for individual records.
- **Privacy by Design**: Sensitive user data is isolated, and data export/deletion are first-class workflows.

### Async Data Lifecycle

All destructive or I/O-heavy user operations (account deletion, data export, prayer/fast log resets) run as **asynchronous lifecycle jobs**. The API returns `202 Accepted` immediately with a job record; the actual work is processed out of band by the backend. This keeps the request path short and avoids timeout risk on large accounts.

### Fault Tolerance

- **Dead Letter Queue (DLQ)**: Failed lifecycle-job processing events are routed to an SQS DLQ for later inspection.
- **CloudWatch Alarms**: The `AlarmStack` monitors Lambda errors, DLQ depth, concurrency limits, and database latencies.

### Operational Excellence

- **Automated Alarms**: The system includes a dedicated `AlarmStack` that monitors Lambda errors, concurrency limits, and database latencies.
- **Disaster Recovery**: DynamoDB point-in-time recovery and scheduled backup exports are configured for the data tables. Restored copies should be sanitized before being put back into service.

---

## Engineering Maturity

- **Type Safety**: TypeScript is used across the entire stack (Frontend, Backend, and Infra). Shared types avoid "syncing" bugs between layers.
- **Developer Experience (DX)**: We leverage LocalStack for local development and optimized deployment scripts to ensure a fast feedback loop.
- **Testing**: We maintain a high standard of coverage with unit tests for Domain/Application logic and integration tests for Infrastructure adapters.

---

Awdah is built around clean boundaries, small handlers, and explicit operational workflows.
