import { Command } from "commander";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";

/**
 * Register completion commands
 */
export function registerCompletionCommands(program: Command): void {
  const completion = program
    .command("completion")
    .description("Manage shell completion");

  completion
    .command("generate <shell>")
    .description("Generate completion script for a specific shell")
    .action(async (shell: string) => {
      const normalizedShell = shell.toLowerCase();
      
      if (!['bash', 'zsh', 'fish', 'powershell'].includes(normalizedShell)) {
        console.error(chalk.red(`✗ Unsupported shell: ${shell}`));
        console.error(chalk.yellow("Supported shells: bash, zsh, fish, powershell"));
        process.exit(1);
      }

      const script = getCompletionScript(normalizedShell);
      console.log(script);
    });

  completion
    .command("install [shell]")
    .description("Install completion for your shell (auto-detects if not specified)")
    .action(async (shell?: string) => {
      const detectedShell = shell || detectShell();
      
      if (!detectedShell) {
        console.error(chalk.red("✗ Could not detect shell"));
        console.error(chalk.yellow("Please specify shell manually: ellygent completion install <shell>"));
        process.exit(1);
      }

      const normalizedShell = detectedShell.toLowerCase();
      
      if (!['bash', 'zsh', 'fish', 'powershell'].includes(normalizedShell)) {
        console.error(chalk.red(`✗ Unsupported shell: ${detectedShell}`));
        console.error(chalk.yellow("Supported shells: bash, zsh, fish, powershell"));
        process.exit(1);
      }

      await installCompletion(normalizedShell);
    });
}

/**
 * Detect current shell
 */
function detectShell(): string | null {
  // Check SHELL environment variable (Unix)
  if (process.env.SHELL) {
    const shellPath = process.env.SHELL;
    if (shellPath.includes('bash')) return 'bash';
    if (shellPath.includes('zsh')) return 'zsh';
    if (shellPath.includes('fish')) return 'fish';
  }

  // Check for PowerShell
  if (process.env.PSModulePath || process.platform === 'win32') {
    return 'powershell';
  }

  return null;
}

/**
 * Get completion script for a shell
 */
function getCompletionScript(shell: string): string {
  switch (shell) {
    case 'bash':
      return getBashCompletion();
    case 'zsh':
      return getZshCompletion();
    case 'fish':
      return getFishCompletion();
    case 'powershell':
      return getPowerShellCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}

/**
 * Bash completion script
 */
function getBashCompletion(): string {
  return `# Ellygent CLI completion for Bash
_ellygent_completion() {
    local cur prev words cword
    _init_completion || return

    local commands="auth context config completion --help --version"
    local auth_commands="login logout status"
    local context_commands="orgs projects versions inspect pull"
    local config_commands="get set list reset"
    local global_flags="--format --json --quiet --verbose --debug --help"

    case "$prev" in
        ellygent)
            COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
            return 0
            ;;
        auth)
            COMPREPLY=( $(compgen -W "$auth_commands $global_flags" -- "$cur") )
            return 0
            ;;
        context)
            COMPREPLY=( $(compgen -W "$context_commands $global_flags" -- "$cur") )
            return 0
            ;;
        config)
            COMPREPLY=( $(compgen -W "$config_commands $global_flags" -- "$cur") )
            return 0
            ;;
        --format)
            COMPREPLY=( $(compgen -W "json markdown md" -- "$cur") )
            return 0
            ;;
    esac
}

complete -F _ellygent_completion ellygent
`;
}

/**
 * Zsh completion script
 */
function getZshCompletion(): string {
  return `#compdef ellygent
# Ellygent CLI completion for Zsh

_ellygent() {
    local -a commands auth_commands context_commands config_commands global_flags

    commands=(
        'auth:Manage authentication'
        'context:Discover and sync context'
        'config:Manage configuration'
        'completion:Manage shell completion'
        '--help:Show help'
        '--version:Show version'
    )

    auth_commands=(
        'login:Authenticate with Ellygent'
        'logout:Clear authentication'
        'status:Show authentication status'
    )

    context_commands=(
        'orgs:List organizations'
        'projects:List projects'
        'versions:List versions'
        'inspect:Inspect project structure'
        'pull:Download context package'
    )

    config_commands=(
        'get:Get configuration value'
        'set:Set configuration value'
        'list:List all configuration'
        'reset:Reset configuration'
    )

    global_flags=(
        '--format:Output format (json, markdown, md)'
        '--json:Output in JSON format'
        '--quiet:Suppress output'
        '--verbose:Verbose output'
        '--debug:Debug output'
        '--help:Show help'
    )

    case $words[2] in
        auth)
            _describe 'auth command' auth_commands
            ;;
        context)
            _describe 'context command' context_commands
            ;;
        config)
            _describe 'config command' config_commands
            ;;
        *)
            _describe 'command' commands
            ;;
    esac
}

_ellygent "$@"
`;
}

/**
 * Fish completion script
 */
function getFishCompletion(): string {
  return `# Ellygent CLI completion for Fish

# Main commands
complete -c ellygent -f -n "__fish_use_subcommand" -a "auth" -d "Manage authentication"
complete -c ellygent -f -n "__fish_use_subcommand" -a "context" -d "Discover and sync context"
complete -c ellygent -f -n "__fish_use_subcommand" -a "config" -d "Manage configuration"
complete -c ellygent -f -n "__fish_use_subcommand" -a "completion" -d "Manage shell completion"

# Global flags
complete -c ellygent -l format -d "Output format" -a "json markdown md"
complete -c ellygent -l json -d "Output in JSON format"
complete -c ellygent -l quiet -d "Suppress output"
complete -c ellygent -l verbose -d "Verbose output"
complete -c ellygent -l debug -d "Debug output"
complete -c ellygent -l help -d "Show help"
complete -c ellygent -l version -d "Show version"

# Auth subcommands
complete -c ellygent -f -n "__fish_seen_subcommand_from auth" -a "login" -d "Authenticate with Ellygent"
complete -c ellygent -f -n "__fish_seen_subcommand_from auth" -a "logout" -d "Clear authentication"
complete -c ellygent -f -n "__fish_seen_subcommand_from auth" -a "status" -d "Show authentication status"

# Context subcommands
complete -c ellygent -f -n "__fish_seen_subcommand_from context" -a "orgs" -d "List organizations"
complete -c ellygent -f -n "__fish_seen_subcommand_from context" -a "projects" -d "List projects"
complete -c ellygent -f -n "__fish_seen_subcommand_from context" -a "versions" -d "List versions"
complete -c ellygent -f -n "__fish_seen_subcommand_from context" -a "inspect" -d "Inspect project structure"
complete -c ellygent -f -n "__fish_seen_subcommand_from context" -a "pull" -d "Download context package"

# Config subcommands
complete -c ellygent -f -n "__fish_seen_subcommand_from config" -a "get" -d "Get configuration value"
complete -c ellygent -f -n "__fish_seen_subcommand_from config" -a "set" -d "Set configuration value"
complete -c ellygent -f -n "__fish_seen_subcommand_from config" -a "list" -d "List all configuration"
complete -c ellygent -f -n "__fish_seen_subcommand_from config" -a "reset" -d "Reset configuration"
`;
}

/**
 * PowerShell completion script
 */
function getPowerShellCompletion(): string {
  return `# Ellygent CLI completion for PowerShell

using namespace System.Management.Automation
using namespace System.Management.Automation.Language

Register-ArgumentCompleter -Native -CommandName 'ellygent' -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @{
        'auth' = @('login', 'logout', 'status')
        'context' = @('orgs', 'projects', 'versions', 'inspect', 'pull')
        'config' = @('get', 'set', 'list', 'reset')
    }

    $globalFlags = @('--format', '--json', '--quiet', '--verbose', '--debug', '--help')

    $commandElements = $commandAst.CommandElements
    $subCommand = $null

    if ($commandElements.Count -ge 2) {
        $subCommand = $commandElements[1].Value
    }

    if ($subCommand -and $commands.ContainsKey($subCommand)) {
        $commands[$subCommand] | ForEach-Object {
            [CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        $globalFlags | ForEach-Object {
            [CompletionResult]::new($_, $_, 'ParameterName', $_)
        }
    }
    else {
        $commands.Keys | ForEach-Object {
            [CompletionResult]::new($_, $_, 'Command', $_)
        }
        @('completion', '--help', '--version') | ForEach-Object {
            [CompletionResult]::new($_, $_, 'ParameterName', $_)
        }
    }
}
`;
}

/**
 * Install completion script
 */
async function installCompletion(shell: string): Promise<void> {
  const script = getCompletionScript(shell);
  const home = homedir();
  
  let targetPath: string;
  let instructions: string;

  switch (shell) {
    case 'bash':
      targetPath = join(home, '.ellygent_completion.bash');
      await fs.writeFile(targetPath, script, 'utf-8');
      
      console.log(chalk.green(`✓ Completion script saved to ${targetPath}`));
      console.log(chalk.blue("\nTo enable completion, add this line to your ~/.bashrc:"));
      console.log(chalk.cyan(`    source ${targetPath}`));
      console.log(chalk.blue("\nThen reload your shell:"));
      console.log(chalk.cyan("    source ~/.bashrc"));
      break;

    case 'zsh':
      targetPath = join(home, '.ellygent_completion.zsh');
      await fs.writeFile(targetPath, script, 'utf-8');
      
      console.log(chalk.green(`✓ Completion script saved to ${targetPath}`));
      console.log(chalk.blue("\nTo enable completion, add this line to your ~/.zshrc:"));
      console.log(chalk.cyan(`    source ${targetPath}`));
      console.log(chalk.blue("\nThen reload your shell:"));
      console.log(chalk.cyan("    source ~/.zshrc"));
      break;

    case 'fish':
      const fishDir = join(home, '.config', 'fish', 'completions');
      try {
        await fs.mkdir(fishDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }
      targetPath = join(fishDir, 'ellygent.fish');
      await fs.writeFile(targetPath, script, 'utf-8');
      
      console.log(chalk.green(`✓ Completion script saved to ${targetPath}`));
      console.log(chalk.blue("\nCompletion is now enabled. Reload your shell or open a new terminal."));
      break;

    case 'powershell':
      targetPath = join(home, 'ellygent_completion.ps1');
      await fs.writeFile(targetPath, script, 'utf-8');
      
      console.log(chalk.green(`✓ Completion script saved to ${targetPath}`));
      console.log(chalk.blue("\nTo enable completion, add this line to your PowerShell profile:"));
      console.log(chalk.cyan(`    . ${targetPath}`));
      console.log(chalk.blue("\nFind your profile path with:"));
      console.log(chalk.cyan("    $PROFILE"));
      console.log(chalk.blue("\nThen reload your profile:"));
      console.log(chalk.cyan("    . $PROFILE"));
      break;
  }

  console.log(chalk.gray("\n💡 Tip: After installation, press TAB to autocomplete commands and flags"));
}
