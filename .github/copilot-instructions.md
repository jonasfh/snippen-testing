# GitHub Copilot Instructions

Follow all project rules, architectural conventions, and multi-agent role contracts defined in:
- [AGENTS.md](file:///../AGENTS.md)
- [WORKFLOW.md](file:///../.agents/common-agent-instructions/WORKFLOW.md)
- [ROLES.md](file:///../.agents/common-agent-instructions/ROLES.md)

## Quick Reminders
- Always work on a `gh-issue/<id>` branch and use Conventional Commits (`<type>[scope]: <description> (#<id>)`).
- Automatically triage task complexity (Level 1 Fast Path vs. Level 2/3 delegation) per `ROLES.md`.
- Keep the integration test harness deterministic (Node.js + Docker Compose) and verify tests/CI compatibility before completing changes.
