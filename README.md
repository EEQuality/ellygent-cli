# Ellygent CLI

Developer CLI for authenticating with Ellygent and downloading AI-optimized engineering context packages into a local workspace.

## Install

```bash
npm install -g @ellygent/cli
```

For local development:

```bash
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
ellygent projects --org john-deere
ellygent versions --project tractor_control
ellygent contents --project tractor_control --version main
```

## Sync Context to Local Workspace

Download an AI-optimized context package:

```bash
ellygent sync --project tractor_control --version main --output ./context/
```

This creates a `.ellygent/` directory with markdown requirements, JSON metadata, and traceability data.

## Example: PAT-based Workflow

```bash
# One-time setup: create .env file
cp .env.example .env
# Edit .env and add your PAT

# Login once (PAT is stored securely)
ellygent login --api-url https://api.ellygent.com

# Use CLI without re-authenticating
ellygent orgs
ellygent projects --org my-org
ellygent sync --project my-project --version v1.0.0 --output ./context/
```

Once logged in with a PAT, the CLI will use it for all subsequent commands until you logout or the token is revoked.

Identifiers are public Ellygent identifiers:

- organizations use organization slugs
- projects use ReqIF `alternative_id`
- versions use `main` or slugified baseline names
- specifications use `alternative_id`

## Sync Context

```bash
ellygent sync --project tractor_control --version main
```

This downloads a ZIP package from the Context API and safely extracts it into:

```text
./.ellygent/
```

Selective export:

```bash
ellygent sync \
  --project tractor_control \
  --version main \
  --spec functional_requirements \
  --spec safety_requirements \
  --include-traceability \
  --include-architecture \
  --include-constraints \
  --include-glossary \
  --include-ai-summaries
```

Use `--workspace <path>` to sync into a specific workspace directory.

## Config

```bash
ellygent config
ellygent config set api-url https://api.example.com
ellygent config set default-org john-deere
ellygent config set default-project tractor_control
```

CI systems can provide a token without an interactive login:

```bash
ellygent config set api-url https://api.example.com
ellygent config set access-token "$ELLYGENT_ACCESS_TOKEN"
ellygent sync --project tractor_control --version main
```

## Development

```bash
npm install
npm run typecheck
npm run build
```

Source layout:

```text
src/
  api/        API clients and endpoint definitions
  commands/   Commander command handlers
  config/     persistent config store
  services/   auth, sync, ZIP extraction
  types/      shared TypeScript contracts
  utils/      terminal/workspace helpers
```



#CLI TEST
elly_pat_4UFMVuNlfQK-prfQzEjvmdVsbp9eJCmG32pxbrMcF6I