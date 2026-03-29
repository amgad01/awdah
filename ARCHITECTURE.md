# Architectural Overview

Awdah is built as a highly robust, scalable, and cost-efficient serverless application. This document outlines the technical decisions and design patterns that make the system resilient and maintainable.

## 🏛️ Strategic Design: The Modular Monolith

We chose a **Modular Monolith** architecture over a distributed microservices approach. This decision was driven by the goal of maximizing developer productivity while retaining the option to split into microservices if needed.

### Key Benefits:

- **Low Cognitive Overhead**: Developers can reason about the entire system in one repository.
- **Transactional Consistency**: Logic within a bounded context can be highly cohesive.
- **Flexible Scalability**: We use independent AWS CDK stacks (Data, Auth, Api, etc.) to allow granular infrastructure management.

---

## 🏗️ Technical Design: Layers & Decoupling

The project follows **Clean Architecture** and **Domain-Driven Design (DDD)**. This architecture ensures that the "Core" of our application (Business Logic) remains isolated from "Shell" details (Cloud providers, frameworks, databases).

### 1. The Domain Layer (The Heart)

- **Entities**: Represent core concepts like `PrayerLog` and `User`.
- **Value Objects**: Immutable types (e.g., `Money`, `PrayerTime`) that encapsulate logic.
- **Business Rules**: Validations and logic that belong purely to the spiritual tracking domain.

### 2. The Application Layer (The Orchestrator)

- **Use Cases**: Single-responsibility classes that execute a specific workflow (e.g., `LogPrayer`, `ResetFasts`).
- **Ports**: Interfaces defined for external interactions (e.g., `IPrayerRepository`).

### 3. The Infrastructure Layer (The Implementation)

- **Adapters**: Concrete implementations of Ports. We use **DynamoDB** for storage, **Cognito** for authentication, and **SNS** for alerting.
- **AWS CDK**: Defines our entire infrastructure as code, ensuring environment parity between Staging and Production.

---

## 🔐 Security & Reliability

### Data Protection

- **Encryption**: All data is encrypted at rest using AWS KMS and in transit via TLS 1.3.
- **Privacy by Design**: Sensitive user data is isolated, and data exports/deletions are first-class workflows.

### Operational Excellence

- **Automated Alarms**: The system includes a dedicated `AlarmStack` that monitors Lambda errors, concurrency limits, and database latencies.
- **Disaster Recovery**: Automatic point-in-time recovery for DynamoDB and cross-region backup capabilities.

---

## ⚡ Engineering Maturity

- **Type Safety**: TypeScript is used across the entire stack (Frontend, Backend, and Infra). Shared types avoid "syncing" bugs between layers.
- **Developer Experience (DX)**: We leverage LocalStack for local development and optimized deployment scripts to ensure a fast feedback loop.
- **Testing**: We maintain a high standard of coverage with unit tests for Domain/Application logic and integration tests for Infrastructure adapters.

---

Awdah represents our commitment to **Clean Code**, **Scalability**, and **Pragmatic Engineering**.
