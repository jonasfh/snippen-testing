# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-30

### Added

- Dev Container configuration (`.devcontainer/devcontainer.json`) for VS Code and GitHub Codespaces.
- Docker-outside-of-Docker feature support for running Docker Compose from the development environment.
- Documentation for Dev Container workflow in `README.md`.

## [0.1.0] - 2026-08-30

### Added

- Initial Node.js project foundation with ES Modules.
- HTTP server with `GET /health` endpoint and graceful shutdown handling.
- Environment configuration parsing and validation (`PORT`, `HOST`, `NODE_ENV`).
- Automated test suite using native `node:test` and `node:assert`.
- Code quality tooling with ESLint and Prettier.
- Containerization support with `Dockerfile` and `.dockerignore`.
- Initial project documentation in `README.md`.
