# Architecture Diagrams

This directory holds the small set of diagrams that best explain how Awdah works in production and during operations.

Each file contains one focused diagram in both ASCII and Mermaid so the docs stay readable in plain text and render well on GitHub.

## Recommended Reading Order

1. [01-system-context.md](01-system-context.md)
2. [02-authenticated-request.md](02-authenticated-request.md)
3. [03-user-lifecycle-jobs.md](03-user-lifecycle-jobs.md)
4. [04-backup-export.md](04-backup-export.md)
5. [05-stack-dependencies.md](05-stack-dependencies.md)

## Why Only These Five

These diagrams cover the highest-value questions for contributors and architecture discussions:

- what the runtime looks like
- how a normal request flows
- how asynchronous work is handled
- how backup and recovery plumbing is wired
- how the AWS stacks depend on each other

Anything more detailed belongs in code comments or deep-dive docs, not in the main diagram set.
