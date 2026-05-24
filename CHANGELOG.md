# Changelog

All notable changes to the Ellygent CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Standalone binary distribution** for Windows, Linux, and macOS (Intel + Apple Silicon)
- Cross-platform build pipeline using `@yao-pkg/pkg`
- Automated archive generation (.zip for Windows, .tar.gz for Unix-like systems)
- SHA256 checksum generation for all release artifacts
- Version metadata generation for frontend consumption
- Installer scripts for quick installation:
  - `install.sh` for Linux/macOS (curl/wget support)
  - `install.ps1` for Windows (PowerShell)
- Automated frontend publishing workflow
- GitHub Actions release pipeline
- Platform-specific download UI in frontend with auto-detection
- Checksum verification in installer scripts
- Direct download support from ellygent.com/cli
- Shell completion support for Bash, Zsh, Fish, and PowerShell
- `completion generate <shell>` command to generate completion scripts
- `completion install [shell]` command with auto-detection
- Tab completion for commands, subcommands, and global flags
- Test infrastructure with vitest
- Coverage reporting with v8 provider
- Test scripts: test, test:watch, test:ui, test:coverage
- Test files for errors, config, output, and formatter modules

### Changed
- Updated package.json with npm publishing metadata (keywords, repository, homepage, bugs)
- Improved package size by excluding test files and source maps (30.0 kB vs 53.3 kB)
- Created .npmignore for selective publishing
- Added PUBLISHING.md with release workflow documentation

## [0.1.0] - 2025-01-XX

### Added
- Initial CLI implementation
- Authentication commands: `auth login`, `auth logout`, `auth status`
- Context discovery commands: `context orgs`, `context projects`, `context versions`
- Content sync command: `context pull`
- Configuration management: `config get`, `config set`, `config list`, `config reset`
- Environment variable support (ELLYGENT_API_URL, ELLYGENT_TOKEN, ELLYGENT_ORG, ELLYGENT_PROJECT)
- Multiple output modes: DEFAULT, JSON, QUIET, VERBOSE, DEBUG
- Comprehensive error handling with exit codes and suggestions
- HTTP retry logic with exponential backoff
- Professional help system with examples
- Structured logging with file output support

### Changed
- Migrated to grouped command structure (auth, context, config)
- Enhanced output system with OutputController
- Improved error presentation with ErrorPresenter

### Infrastructure
- TypeScript 5.5.3 with strict mode
- Commander.js 12.1.0 for command parsing
- Chalk 5.3.0 for terminal colors
- Ora 8.1.1 for spinners
- Inquirer prompts 5.5.0 for interactive input
- ESM module system

### Developer Experience
- Comprehensive documentation in README.md
- Backward compatibility with legacy command aliases
- NO_COLOR environment variable support
- Cross-platform config storage (Windows: %APPDATA%, Unix: ~/.ellygent)

[Unreleased]: https://github.com/ellygent/ellygent-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ellygent/ellygent-cli/releases/tag/v0.1.0
