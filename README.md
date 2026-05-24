# Ellygent CLI

Developer CLI for authenticating with Ellygent and downloading AI-optimized engineering context packages into a local workspace.

## Install

### Quick Install (Recommended)

**Linux/macOS:**
```bash
curl -fsSL https://ellygent.com/cli/install.sh | sh
```

**Windows (PowerShell):**
```powershell
irm https://ellygent.com/cli/install.ps1 | iex
```

### Download Standalone Binary

Download pre-built binaries from [ellygent.com/cli](https://ellygent.com/cli) or [GitHub Releases](https://github.com/EEQuality/ellygent-cli/releases):

- **Windows (x64)**: `ellygent-win-x64.exe`
- **Linux (x64)**: `ellygent-linux-x64`
- **macOS Intel (x64)**: `ellygent-macos-x64`
- **macOS Apple Silicon (ARM64)**: `ellygent-macos-arm64`

Extract and move the binary to a directory in your PATH.

### Install via npm

```bash
npm install -g @ellygent/cli
```

### Build from Source

For local development:

```bash
git clone https://github.com/EEQuality/ellygent-cli.git
cd ellygent-cli
npm install
npm run build
npm link
```

## Login

```bash
ellygent login
```

The login flow prompts for:

- Ellygent API URL
- email
- password

Passwords are never persisted. The CLI stores API URL and issued tokens in the user config directory:

- Linux/macOS: `~/.ellygent/config.json` or `$XDG_CONFIG_HOME/ellygent/config.json`
- Windows: `%APPDATA%\Ellygent\config.json`

### Login with Email/Password

For non-interactive login, set `ELLYGENT_PASSWORD` and pass URL/email:

```bash
ELLYGENT_PASSWORD='...' ellygent login --api-url https://api.example.com --email dev@example.com
```

### Login with Personal Access Token (PAT)

For automated workflows, CI/CD, or long-term CLI access, use a Personal Access Token instead of email/password.

**Generate a PAT:**

1. Log in to Ellygent web interface
2. Go to Account → Personal Access Tokens
3. Click "Create New Token"
4. Give it a name (e.g., "CLI", "Local Dev")
5. Copy the token (starts with `elly_pat_`)

**Option 1: Use environment variable (recommended)**

Set `ELLYGENT_PAT` in your environment:

```bash
export ELLYGENT_PAT='elly_pat_xxxxxxxxxxxxxxxxxxxxx'
ellygent login --api-url https://api.example.com
```

**Option 2: Use .env file**

Create a `.env` file in your project directory:

```bash
ELLYGENT_PAT=elly_pat_xxxxxxxxxxxxxxxxxxxxx
ELLYGENT_API_URL=https://api.example.com
```

Then login:

```bash
ellygent login --api-url $ELLYGENT_API_URL
```

**Option 3: Pass directly as flag**

```bash
ellygent login --api-url https://api.example.com --pat elly_pat_xxxxxxxxxxxxxxxxxxxxx
```

**Security notes:**

- PATs are stored securely in your config file (mode 0600)
- Never commit PATs to version control
- Add `.env` to your `.gitignore`
- Revoke PATs you no longer need from the Ellygent web interface

## Discover Context

List organizations, projects, versions, and contents:

```bash
ellygent orgs
ellygent projects --org john-doe
ellygent versions --project tractor_control
ellygent contents --project tractor_control --version main
```

### Output Format

By default, all commands output JSON. Use `--format` or `-f` to change output format:

```bash
# JSON output (default)
ellygent orgs

# Markdown table output
ellygent orgs --format markdown
ellygent projects --org my-org -f md

# All commands support both formats
ellygent versions --project tractor_control --format md
ellygent contents --project tractor_control --version main -f json
```

**Supported formats:**
- `json` (default) — machine-readable JSON output
- `markdown` or `md` — human-readable markdown tables

## Sync Context to Local Workspace

Download an AI-optimized context package:

```bash
ellygent sync --project tractor_control --version main
```

This downloads a ZIP package from the Context API and safely extracts it into `./.ellygent/` with markdown requirements, JSON metadata, and traceability data.

### Sync Options

```bash
# Sync to custom workspace directory
ellygent sync --project tractor_control --version main --workspace ./context/

# Selective export: specific specifications only
ellygent sync \
  --project tractor_control \
  --version main \
  --spec functional_requirements \
  --spec safety_requirements

# Include optional context
ellygent sync \
  --project tractor_control \
  --version main \
  --include-traceability \
  --include-architecture \
  --include-constraints \
  --include-glossary \
  --include-ai-summaries
```

**Identifiers:**
- Organizations use organization slugs (e.g., `john-doe`)
- Projects use ReqIF `alternative_id`
- Versions use `main` or slugified baseline names
- Specifications use `alternative_id`

## Config

View or update stored configuration:

```bash
# Show current config
ellygent config

# Set configuration values
ellygent config set api-url https://api.example.com
ellygent config set default-org john-doe
ellygent config set default-project tractor_control
```

**Config keys:**
- `api-url` — Ellygent API base URL
- `default-org` — Default organization for commands
- `default-project` — Default project for commands
- `access-token` — Manually set access token (advanced)
- `refresh-token` — Manually set refresh token (advanced)

## Environment Variables

Environment variables can override file-based configuration. This is useful for CI/CD pipelines, containerized environments, and temporary overrides.

**Supported variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `ELLYGENT_API_URL` | API base URL | `https://api.ellygent.com` |
| `ELLYGENT_TOKEN` | Access token (PAT or JWT) | `elly_pat_xxxxx` |
| `ELLYGENT_ORG` | Default organization | `my-org` |
| `ELLYGENT_PROJECT` | Default project | `my-project` |
| `ELLYGENT_PAT` | Personal Access Token for login | `elly_pat_xxxxx` |
| `ELLYGENT_PASSWORD` | Password for email/password login | `********` |

**Priority order** (highest to lowest):
1. Command-line flags (`--org`, `--project`, etc.)
2. Environment variables (`ELLYGENT_*`)
3. Config file (`~/.ellygent/config.json`)
4. Built-in defaults

**Example usage:**

```bash
# Temporary override for one command
ELLYGENT_ORG=test-org ellygent projects

# Session-wide override
export ELLYGENT_API_URL=https://staging.ellygent.com
ellygent orgs
ellygent projects --org my-org

# CI/CD environment
export ELLYGENT_TOKEN="${SECRET_TOKEN}"
export ELLYGENT_ORG=prod-org
ellygent sync --project critical-system --version v2.0.0

# Check which values come from env vs file
ellygent config list
```

**Security notes:**
- Never commit environment variables to version control
- Use `.env` files locally and add them to `.gitignore`
- In CI/CD, use secret management (GitHub Secrets, GitLab CI/CD variables, etc.)
- Environment variables are visible to all processes — use carefully in shared environments

## Example Workflows

### PAT-based Development Workflow

```bash
# One-time setup: create .env file
echo "ELLYGENT_PAT=elly_pat_xxxxxxxxxxxxxxxxxxxxx" > .env
echo "ELLYGENT_API_URL=https://api.ellygent.com" >> .env

# Login once (PAT is stored securely)
ellygent login --api-url https://api.ellygent.com

# Set defaults to avoid repeating options
ellygent config set default-org my-org
ellygent config set default-project my-project

# Use CLI without re-authenticating
ellygent orgs -f md
ellygent projects
ellygent versions
ellygent sync --version v1.0.0
```

### CI/CD Pipeline Integration

```bash
# Authenticate with PAT from environment
export ELLYGENT_PAT="${SECRET_ELLYGENT_PAT}"
ellygent login --api-url https://api.ellygent.com

# Download context for validation or analysis
ellygent sync \
  --project safety_critical_system \
  --version baseline-1.2.0 \
  --workspace ./engineering-context/ \
  --include-traceability \
  --format json

# Parse JSON output programmatically
ellygent projects --org automotive --format json | jq '.[] | .identifier'
```

## Shell Completion

Enable tab completion for faster command entry and discovery.

### Automatic Installation

The CLI auto-detects your shell and installs completion:

```bash
ellygent completion install
```

### Manual Installation

Install for a specific shell:

```bash
# Bash
ellygent completion install bash

# Zsh
ellygent completion install zsh

# Fish
ellygent completion install fish

# PowerShell
ellygent completion install powershell
```

### Generate Scripts Only

Generate completion scripts without installing:

```bash
# Print to stdout
ellygent completion generate bash
ellygent completion generate zsh
ellygent completion generate fish
ellygent completion generate powershell

# Save to file
ellygent completion generate bash > ellygent-completion.bash
```

### What Gets Completed

Tab completion supports:

- **Commands**: `auth`, `context`, `config`, `completion`
- **Subcommands**: `auth login`, `context pull`, `config set`, etc.
- **Global flags**: `--format`, `--json`, `--quiet`, `--verbose`, `--debug`, `--help`
- **Format values**: `json`, `markdown`, `md`

**Example usage:**

```bash
# Type and press TAB
ellygent auth <TAB>
# → login  logout  status

ellygent context <TAB>
# → orgs  projects  versions  inspect  pull

ellygent --format <TAB>
# → json  markdown  md
```

### Shell-Specific Notes

**Bash**  
Completion added to `~/.ellygent_completion.bash`. Source it in `~/.bashrc`:
```bash
source ~/.ellygent_completion.bash
```

**Zsh**  
Completion added to `~/.ellygent_completion.zsh`. Source it in `~/.zshrc`:
```zsh
source ~/.ellygent_completion.zsh
```

**Fish**  
Completion installed to `~/.config/fish/completions/ellygent.fish`. Auto-loaded.

**PowerShell**  
Completion saved to `~/ellygent_completion.ps1`. Source it in your profile:
```powershell
. ~/ellygent_completion.ps1
```

Find your PowerShell profile path with `$PROFILE`, then add the source line.

## Development

```bash
npm install
npm run typecheck
npm run build
npm link  # for local testing
```

**Source layout:**

```text
src/
  api/        API clients and endpoint definitions
  commands/   Commander command handlers
  config/     Persistent config store
  services/   Auth, sync, ZIP extraction
  types/      Shared TypeScript contracts
  utils/      Terminal/workspace helpers
```