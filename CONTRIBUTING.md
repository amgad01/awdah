# Contributing to Awdah

Welcome to Awdah! This guide provides everything a new developer needs to get started with the project, understand our architectural decisions, and follow our development standards.

## Project Vision

Awdah is a serverless application designed to help users track and manage their spiritual goals (Salah and Sawm) with a focus on data durability, privacy, and seamless performance. It serves as a modern template for high-scale, cost-effective serverless architecture on AWS.

---

## 🏗️ Architecture Philosophy

We adhere to **Clean Architecture** and **Domain-Driven Design (DDD)** principles to ensure the codebase remains maintainable, testable, and decoupled from infrastructure.

### 1. Modular Monolith

While the application is deployed as independent serverless stacks, the codebase is organized as a **Modular Monolith** within a monorepo. This gives us:

- **Simplified Deployment**: One repository, consistent tooling.
- **Strong Isolation**: Bounded contexts (`salah`, `sawm`, `user`) are logically separated.
- **Shared Type Safety**: A common `shared` package ensures consistency between backend logic and frontend consumption.

### 2. Hexagonal Architecture (Ports & Adapters)

Dependencies always point inward toward the **Domain**:

- **Domain**: Pure business logic, entities, and value objects. ZERO external dependencies.
- **Application**: Use Cases that orchestrate domain logic.
- **Infrastructure**: Concrete implementations (DynamoDB repositories, Lambda handlers, External APIs).

---

## 📂 Monorepo Structure

- `apps/frontend`: React (Vite) + TypeScript. Modern UI with absolute focus on aesthetics.
- `apps/backend`: Node.js + TypeScript. Lambda handlers and serverless compute logic.
- `packages/shared`: Shared types, constants, and utilities used across the stack.
- `infra/`: AWS CDK (TypeScript). Infrastructure-as-Code for all resources.
- `scripts/`: Essential automation for deployment, local checks, and debugging.

---

## 🛠️ Local Development Setup

### 1. Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **Docker**: For running LocalStack (simulates AWS services locally)
- **AWS CLI**: For infrastructure interaction.

### 2. Installation

```bash
npm install
```

### 3. Local Cloud Simulation

We use **LocalStack** to develop without incurring AWS costs:

```bash
docker-compose up -d
```

### 4. Running the App

- **Backend**: `npm run dev:backend` (simulates Lambda environment locally)
- **Frontend**: `npm run dev:frontend` (Vite dev server)

---

## 🏗️ AWS CDK Stack Organization

We split our infrastructure into logical stacks to isolate changes, speed up deployments, and protect persistent data.

| Stack             | Responsibility                  | Why the split?                                                 |
| ----------------- | ------------------------------- | -------------------------------------------------------------- |
| **DataStack**     | DynamoDB Tables, S3 Buckets     | Protects data from accidental deletion during compute updates. |
| **AuthStack**     | Cognito User Pool & Client      | Centralizes Identity Management.                               |
| **ApiStack**      | API Gateway & Lambda Functions  | Rapid iteration layer for business logic.                      |
| **AlarmStack**    | CloudWatch Alarms & Dashboards  | Holistic monitoring of the entire system.                      |
| **BackupStack**   | Daily S3 Exports & Archival     | Ensures data durability and disaster recovery.                 |
| **FrontendStack** | S3 Website Hosting & CloudFront | Static asset delivery.                                         |

### 🔍 Where should I add my new resource?

| If you are adding...               | Go to...                               |
| ---------------------------------- | -------------------------------------- |
| A new DynamoDB Table or S3 Bucket  | `infra/lib/stacks/data-stack.ts`       |
| A new API Route or Lambda Function | `infra/lib/stacks/api-stack.ts`        |
| A new Authentication feature       | `infra/lib/stacks/auth-stack.ts`       |
| A new system-wide health alarm     | `infra/lib/stacks/alarm-stack.ts`      |
| A new shared resource default      | `infra/lib/shared/resource-factory.ts` |

### 🔗 Handling Cross-Stack Dependencies

Since our infrastructure is decoupled into multiple stacks, you often need to share resources (e.g., passing an S3 bucket URL from `DataStack` to a Lambda in `ApiStack`).

1.  **Expose the Resource**: In the source stack (e.g., `DataStack`), define the resource as a `public readonly` property.
2.  **Update Props**: In the consumer stack's `Props` interface (e.g., `ApiStackProps`), add the source stack as a dependency.
3.  **Inject in App**: In `infra/bin/app.ts`, pass the source stack instance into the consumer stack's constructor.
4.  **Use it**: Access the property in the consumer stack. CDK automatically handles the `Export/ImportValue` logic for you.

> [!TIP]
> **Automatic IAM**: If you call `bucket.grantRead(myLambda)`, CDK will automatically export the necessary IAM permissions across the stack boundary.

---

## 🚀 Deployment Workflow

We use **AWS CDK** for all infrastructure. To optimize developer experience, we've provided multiple deployment tires:

- **Standard Deployment**: `npm run deploy` (Full synth, bootstrap, and deploy).
- **Iterative Updates**: `npm run deploy:quick`. **Recommended for daily work.** It skips redundant builds and uses CDK **Hotswap** for near-instant Lambda updates.
- **Stack Management**: `npm run deploy:stack` or `npm run destroy:stack` (Interactive menu to manage individual stacks).

---

## 📏 Code Standards & Workflow

### Branching & Commits

- Follow **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`).
- Keep PRs focused on a single responsibility.

### Quality Checks

Before pushing, it is highly recommended to run our pre-push suite:

```bash
npm run check:quick  # Fast lint and unit tests
npm run check        # Full audit, including typecheck and security (slow)
```

### Clean Code

- **No Docstrings**: We believe in self-documenting code. Use expressive variable and function names.
- **Natural Language**: Write code as if you're explaining the logic to a peer. Avoid "academic" or overly clever abstractions that hide intent.

---

Thank you for contributing to Awdah! If you have any questions, feel free to reach out to the core team.
