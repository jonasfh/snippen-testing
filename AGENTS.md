# Agent Instructions for Snippen Testing

## Common Guidelines

All developers and AI agents must follow the core workflows, documentation rules, and quality standards defined in the common guidelines submodule:

- 🔄 **[Workflow Guidelines](file:///./.agents/common-agent-instructions/WORKFLOW.md)**: GitHub issue workflow, branch naming (`gh-issue/<id>`), commit conventions `(#<id>)`, PR rebase-merge requirements, changelog updates, and environment adaptation.
- 📝 **[Documentation Standards](file:///./.agents/common-agent-instructions/DOCUMENTATION.md)**: User vs. developer docs, continuous documentation synchronization, and Mermaid diagram formatting.
- 🧪 **[Testing & Quality Assurance](file:///./.agents/common-agent-instructions/TESTING.md)**: Automated testing requirements, zero-lint policy, and whitespace/formatting hygiene.
- 📐 **[Architecture Standards](file:///./.agents/common-agent-instructions/ARCHITECTURE.md)**: Modularity, explicit interfaces, and database timestamp rules.

---

## Node.js Guidelines

All Node.js-based services, modules, and tests must adhere to the conventions defined in the Node.js agent instructions submodule:

- 🏗️ **[Architecture & Backend Design](file:///./.agents/node-agent-instructions/ARCHITECTURE.md)**: Layered structure, environment configuration, async patterns, error handling, and graceful shutdown.
- 📦 **[Package & Dependency Management](file:///./.agents/node-agent-instructions/DEPENDENCIES.md)**: `npm` conventions, `package-lock.json`, dependency minimization, and script definitions.
- 🧪 **[Testing & Quality Assurance](file:///./.agents/node-agent-instructions/TESTING.md)**: Node test runner conventions, boundary mocking, and deterministic async testing.
- 🎨 **[Code Style & Idioms](file:///./.agents/node-agent-instructions/CODE_STYLE.md)**: Modern JavaScript/TypeScript standards, error hierarchy, and structured logging.

---

## Repository-Specific Instructions

### Objective

Add repository-specific instructions for AI coding agents working on the Snippen integration test harness.

The instructions give agents enough context to understand the purpose, architecture, domain and development conventions before making changes.

### Repository Purpose

This repository is a test harness for integration and end-to-end testing of the Snippen ecosystem.

The primary systems under test are:

* `snippen-booking`
* `snippen-sms-service`

The repository is **not** a production SMS service.

Its purpose is to make it possible to run realistic communication scenarios locally and in CI without sending real SMS messages.

### Technology

The project uses:

* Node.js
* JavaScript
* npm
* Docker / Docker Compose

The Node.js application is the HTTP server.

Do not introduce nginx, Apache, Python, or another application server without a specific architectural reason.

Prefer simple solutions and existing Node.js functionality where practical.

### Architecture

The intended architecture is:

```text
┌─────────────────┐
│ snippen-booking │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────┐
│ snippen-sms-service │
└──────────┬──────────┘
           │ SMS provider API
           ▼
┌─────────────────────┐
│ fake SMS provider   │
└─────────────────────┘
```

The real Snippen applications should be used whenever practical.

Mocking should primarily happen at external boundaries.

In particular, the SMS provider should be replaced by the fake SMS provider during automated tests.

### Domain and Communication Model

Snippen users create and manage their own bookings through `snippen-booking`.

SMS is primarily used for operational communication related to bookings.

Examples include:

* door/access codes
* practical information
* tables and chairs
* cleaning
* payment reminders
* administrative messages
* reminders
* questions or replies from tenants
* administrator notifications

Do not design test scenarios around artificial booking-confirmation protocols such as:

```text
"Reply JA to confirm your booking"
```

A tenant's incoming SMS should instead be treated as normal communication that may be associated with an existing user, booking, or administrative conversation as appropriate.

### Testing Philosophy

Prefer testing the complete communication flow:

```text
booking
  ↓
sms-service
  ↓
fake provider
```

and:

```text
fake provider
  ↓
sms-service
  ↓
booking
```

Do not replace `snippen-booking` or `snippen-sms-service` with mocks when an actual integration test is intended.

Tests should:

* use realistic business scenarios
* be deterministic
* isolate their data
* avoid real SMS
* avoid production infrastructure
* make failures easy to diagnose
* verify observable behavior rather than implementation details

### Test Data

Use clearly identifiable test users, bookings and phone numbers.

Never commit:

* real customer data
* real phone numbers
* production credentials
* API keys
* production URLs unless they are explicitly documented public values

Test data should be disposable.

### Fake SMS Provider

The fake provider represents the external SMS provider.

It should:

* accept outgoing SMS from `snippen-sms-service`
* retain outgoing messages for inspection
* allow tests to inject incoming SMS
* expose enough information for tests to verify message delivery
* support resetting its state

The fake provider should not attempt to emulate a real SMS network beyond what is required by the tests.

Its API should remain small and focused.

### API Design

Keep HTTP APIs simple and explicit.

Use JSON for API requests and responses unless there is a specific reason not to.

Validate externally supplied data.

Return appropriate HTTP status codes.

Document APIs in the repository.

### Docker

Docker Compose is the canonical integration-test environment.

Services should communicate using Docker Compose service names rather than host-specific addresses.

The default configuration must be safe and must not be able to send real SMS accidentally.

### Configuration

Use environment variables or test-specific configuration for:

* service URLs
* ports
* credentials
* feature flags
* test-specific settings

Do not hard-code environment-specific values in application code.

### Documentation

Keep `README.md` and other documentation synchronized with implementation.

When introducing a new service, API or test scenario, update the relevant documentation.

Documentation should explain not only how something works, but also why the architecture is structured that way when the reasoning is important.

### Definition of Done

For changes that affect behavior:

* add or update automated tests
* update relevant test scenarios
* update documentation when necessary
* verify Docker/CI compatibility when relevant

A solution that only works on one developer's machine is not considered complete.
