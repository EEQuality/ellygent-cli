import chalk from "chalk";

export type OutputFormat = "json" | "markdown" | "md";

export interface FormatterContext {
  format: OutputFormat;
}

export function createFormatter(format: OutputFormat): FormatterContext {
  return { format };
}

export function outputTable<T extends object>(
  rows: T[],
  columns: string[],
  context: FormatterContext
): void {
  const normalizedFormat = context.format === "md" ? "markdown" : context.format;

  if (normalizedFormat === "json") {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  // Markdown table format
  if (rows.length === 0) {
    console.log("_No results._");
    return;
  }

  const widths = columns.map((column) =>
    Math.max(
      column.length,
      ...rows.map((row) => String((row as Record<string, unknown>)[column] ?? "").length)
    )
  );

  const header = columns.map((column, index) => column.padEnd(widths[index])).join(" | ");
  console.log(`| ${header} |`);
  console.log(`| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`);

  for (const row of rows) {
    const record = row as Record<string, unknown>;
    const rowText = columns
      .map((column, index) => String(record[column] ?? "").padEnd(widths[index]))
      .join(" | ");
    console.log(`| ${rowText} |`);
  }
}

export function outputTree(data: unknown, context: FormatterContext): void {
  const normalizedFormat = context.format === "md" ? "markdown" : context.format;

  if (normalizedFormat === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Markdown tree format (handled by caller for now)
  // This is a pass-through for backwards compatibility
  if (typeof data === "object" && data !== null && "specifications" in data) {
    renderContentsTreeMarkdown(data as ContentsData);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

interface ContentsData {
  specifications?: Array<{
    identifier: string;
    name: string;
    description?: string;
  }>;
  systemDefinitions?: Array<{
    identifier: string;
    name: string;
    description?: string;
  }>;
  traceability?: { available: boolean };
  architecture?: { available: boolean };
  constraints?: { available: boolean };
  glossary?: { available: boolean };
  aiSummaries?: { available: boolean };
}

function renderContentsTreeMarkdown(contents: ContentsData): void {
  if (contents.specifications && contents.specifications.length > 0) {
    console.log("\n**Specifications:**");
    for (const spec of contents.specifications) {
      console.log(`- ${spec.identifier} — ${spec.name}`);
      if (spec.description) {
        console.log(`  ${spec.description}`);
      }
    }
  }

  if (contents.systemDefinitions && contents.systemDefinitions.length > 0) {
    console.log("\n**System Definitions:**");
    for (const def of contents.systemDefinitions) {
      console.log(`- ${def.identifier} — ${def.name}`);
      if (def.description) {
        console.log(`  ${def.description}`);
      }
    }
  }

  console.log("\n**Optional Context:**");
  const checks = [
    { label: "Traceability", value: contents.traceability?.available },
    { label: "Architecture", value: contents.architecture?.available },
    { label: "Constraints", value: contents.constraints?.available },
    { label: "Glossary", value: contents.glossary?.available },
    { label: "AI Summaries", value: contents.aiSummaries?.available }
  ];

  for (const check of checks) {
    const status = check.value ? "✓" : "✗";
    console.log(`${status} ${check.label}`);
  }
}

export function outputSuccess(message: string, context: FormatterContext): void {
  const normalizedFormat = context.format === "md" ? "markdown" : context.format;

  if (normalizedFormat === "json") {
    console.log(JSON.stringify({ status: "success", message }, null, 2));
    return;
  }

  console.log(chalk.green("✓"), message);
}

export function outputInfo(message: string, context: FormatterContext): void {
  const normalizedFormat = context.format === "md" ? "markdown" : context.format;

  if (normalizedFormat === "json") {
    console.log(JSON.stringify({ status: "info", message }, null, 2));
    return;
  }

  console.log(chalk.cyan("ℹ"), message);
}

export function outputError(message: string, context: FormatterContext): void {
  const normalizedFormat = context.format === "md" ? "markdown" : context.format;

  if (normalizedFormat === "json") {
    console.error(JSON.stringify({ status: "error", message }, null, 2));
    return;
  }

  console.error(chalk.red("✗"), message);
}

export function outputData(data: unknown, context: FormatterContext): void {
  const normalizedFormat = context.format === "md" ? "markdown" : context.format;

  if (normalizedFormat === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // For markdown, render as formatted JSON code block
  console.log("```json");
  console.log(JSON.stringify(data, null, 2));
  console.log("```");
}
