/**
 * glabs projects list | get
 */

import { parseArgs } from "node:util";
import { loadConfig } from "./cli-config.js";
import { createClient } from "./cli-client.js";
import { fatal, printJson, printTable } from "./cli-output.js";

const HELP = `Usage: glabs projects <list|get> [options]

Subcommands:
  list            List projects
  get <id>        Get project by ID

List options:
  --page-size <n>   Number of results (default: 20)
  --json            Output raw JSON

Get options:
  --json            Output raw JSON
`;

export async function run(args: string[]) {
  const sub = args[0];

  if (!sub || sub === "--help" || sub === "-h") {
    console.log(HELP);
    return;
  }

  const cfg = loadConfig();
  const client = await createClient(cfg);

  try {
    if (sub === "list") {
      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          "page-size": { type: "string" },
          json: { type: "boolean", default: false },
        },
        strict: true,
      });

      const result = await client.projects.list({
        pageSize: values["page-size"] ? Number(values["page-size"]) : undefined,
      });

      if (values.json) {
        printJson(result);
        return;
      }

      if (result.projects.length === 0) {
        console.log("No projects found.");
        return;
      }

      console.log(`Projects (${result.projects.length}):\n`);
      for (const p of result.projects) {
        printTable([
          ["ID", p.projectId],
          ["Title", p.projectInfo.projectTitle],
          ["Created", p.creationTime],
        ]);
        console.log();
      }
      return;
    }

    if (sub === "get") {
      const { values, positionals } = parseArgs({
        args: args.slice(1),
        options: {
          json: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: true,
      });

      const projectId = positionals[0];
      if (!projectId) fatal("Project ID required. Usage: glabs projects get <id>");

      const result = await client.projects.get({ projectId });

      if (values.json) {
        printJson(result);
        return;
      }

      printTable([
        ["ID", result.projectId],
        ["Title", result.projectInfo.projectTitle],
      ]);
      return;
    }

    fatal(`Unknown subcommand: ${sub}. Use "glabs projects --help".`);
  } finally {
    await client.close();
  }
}
