import type { ContextContents, ContextNamedItem } from "../types/context.js";
import { renderBoolean } from "./terminal.js";

export function renderContentsTree(contents: ContextContents): void {
  console.log(".ellygent/");
  renderNamedItems("system_definitions", contents.system_definitions);
  renderNamedItems("specifications", contents.specifications);
  console.log(`├─ traceability: ${renderBoolean(contents.traceability.available)} (${contents.traceability.relationship_count} relationships)`);
  console.log(`├─ architecture: ${renderBoolean(contents.architecture.available)}`);
  console.log(`├─ constraints: ${renderBoolean(contents.constraints.available)}`);
  console.log(`└─ glossary: ${renderBoolean(contents.glossary.available)}`);
}

function renderNamedItems(label: string, items: ContextNamedItem[]): void {
  console.log(`├─ ${label}`);
  if (items.length === 0) {
    console.log("│  └─ none");
    return;
  }

  items.forEach((item, index) => {
    const branch = index === items.length - 1 ? "└─" : "├─";
    console.log(`│  ${branch} ${item.identifier}  ${item.name}`);
  });
}
