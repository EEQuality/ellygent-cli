import chalk from "chalk";

export function printSuccess(message: string): void {
  console.log(chalk.green("OK"), message);
}

export function printInfo(message: string): void {
  console.log(chalk.cyan("info"), message);
}

export function printWarning(message: string): void {
  console.log(chalk.yellow("warn"), message);
}

export function printError(message: string): void {
  console.error(chalk.red("error"), message);
}

export function renderTable<T extends object>(rows: T[], columns: string[]): void {
  if (rows.length === 0) {
    printInfo("No results.");
    return;
  }

  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => String((row as Record<string, unknown>)[column] ?? "").length))
  );

  const header = columns.map((column, index) => column.padEnd(widths[index])).join("  ");
  console.log(chalk.bold(header));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));

  for (const row of rows) {
    const record = row as Record<string, unknown>;
    console.log(columns.map((column, index) => String(record[column] ?? "").padEnd(widths[index])).join("  "));
  }
}

export function renderBoolean(value: boolean): string {
  return value ? chalk.green("available") : chalk.gray("not available");
}

export function quietToken(value: string | undefined): string {
  if (!value) {
    return "";
  }
  return "<configured>";
}
