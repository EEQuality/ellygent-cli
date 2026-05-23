import chalk from "chalk";

/**
 * Help formatting utilities for consistent CLI help output
 */

export interface CommandExample {
  description: string;
  command: string;
}

export interface HelpSection {
  title: string;
  content: string;
}

/**
 * Format a list of examples for command help
 */
export function formatExamples(examples: CommandExample[]): string {
  const lines = examples.map(ex => 
    `  ${chalk.dim("#")} ${chalk.dim(ex.description)}\n  ${chalk.cyan("$")} ${ex.command}`
  );
  return `\n${chalk.bold("EXAMPLES")}\n${lines.join("\n\n")}\n`;
}

/**
 * Format a "Learn More" section with links and related commands
 */
export function formatLearnMore(items: string[]): string {
  const lines = items.map(item => `  ${item}`);
  return `\n${chalk.bold("LEARN MORE")}\n${lines.join("\n")}\n`;
}

/**
 * Format command options into grouped sections
 */
export interface OptionInfo {
  flags: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
}

export function formatOptions(options: OptionInfo[]): string {
  const required = options.filter(o => o.required);
  const optional = options.filter(o => !o.required);
  
  const formatGroup = (opts: OptionInfo[]) => {
    const maxFlagLength = Math.max(...opts.map(o => o.flags.length));
    return opts.map(o => {
      const padding = " ".repeat(maxFlagLength - o.flags.length + 2);
      const defaultText = o.defaultValue ? chalk.dim(` (default: ${o.defaultValue})`) : "";
      return `  ${chalk.yellow(o.flags)}${padding}${o.description}${defaultText}`;
    }).join("\n");
  };
  
  let result = `\n${chalk.bold("OPTIONS")}\n`;
  
  if (required.length > 0) {
    result += chalk.dim("  Required:\n");
    result += formatGroup(required) + "\n\n";
  }
  
  if (optional.length > 0) {
    if (required.length > 0) {
      result += chalk.dim("  Optional:\n");
    }
    result += formatGroup(optional) + "\n";
  }
  
  return result;
}

/**
 * Format command categories for top-level help
 */
export interface CommandCategory {
  name: string;
  description: string;
  commands: Array<{
    name: string;
    description: string;
  }>;
}

export function formatCommandCategories(categories: CommandCategory[]): string {
  const lines: string[] = [];
  
  for (const category of categories) {
    lines.push(`\n${chalk.bold(category.name.toUpperCase())}`);
    lines.push(chalk.dim(`  ${category.description}`));
    lines.push("");
    
    const maxNameLength = Math.max(...category.commands.map(c => c.name.length));
    
    for (const cmd of category.commands) {
      const padding = " ".repeat(maxNameLength - cmd.name.length + 2);
      lines.push(`  ${chalk.cyan(cmd.name)}${padding}${cmd.description}`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Format usage syntax
 */
export function formatUsage(commandPath: string, args: string = "[options]"): string {
  return `\n${chalk.bold("USAGE")}\n  ${chalk.cyan("$")} ${commandPath} ${args}\n`;
}

/**
 * Create a custom help text section with title and content
 */
export function formatCustomSection(title: string, content: string): string {
  return `\n${chalk.bold(title)}\n${content}\n`;
}

/**
 * Create a complete command help template
 */
export interface CommandHelpTemplate {
  description: string;
  usage?: string;
  options?: OptionInfo[];
  examples?: CommandExample[];
  learnMore?: string[];
  additionalSections?: HelpSection[];
}

export function buildCommandHelp(template: CommandHelpTemplate): string {
  const sections: string[] = [];
  
  if (template.usage) {
    sections.push(formatUsage(template.usage));
  }
  
  if (template.options && template.options.length > 0) {
    sections.push(formatOptions(template.options));
  }
  
  if (template.examples && template.examples.length > 0) {
    sections.push(formatExamples(template.examples));
  }
  
  if (template.additionalSections) {
    for (const section of template.additionalSections) {
      sections.push(formatCustomSection(section.title, section.content));
    }
  }
  
  if (template.learnMore && template.learnMore.length > 0) {
    sections.push(formatLearnMore(template.learnMore));
  }
  
  return sections.join("");
}
