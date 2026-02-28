/**
 * glabs serve — Start OpenAI-compatible server
 */

import { parseArgs } from "node:util";
import { loadConfig } from "./cli-config.js";
import { createClient } from "./cli-client.js";
import { fatal } from "./cli-output.js";

const HELP = `Usage: glabs serve [options]

Start an OpenAI-compatible HTTP server wrapping the GLabs SDK.

Options:
  --port <n>              Port to listen on (default: 8000)
  --host <addr>           Host to bind to (default: 0.0.0.0)
  --api-key <key>         Optional API key for auth
  --max-concurrent <n>    Max concurrent generation tasks (default: 4)
`;

export async function run(args: string[]) {
  if (args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    return;
  }

  const { values } = parseArgs({
    args,
    options: {
      port: { type: "string" },
      host: { type: "string" },
      "api-key": { type: "string" },
      "max-concurrent": { type: "string" },
    },
    strict: true,
  });

  const cfg = loadConfig();
  const client = await createClient(cfg);

  try {
    const { OpenAIServer } = await import("../openai-server.js");

    const server = new OpenAIServer(client, {
      port: values.port ? Number(values.port) : 8000,
      host: values.host ?? "0.0.0.0",
      apiKey: values["api-key"],
      maxConcurrentGenerations: values["max-concurrent"]
        ? Number(values["max-concurrent"])
        : 4,
    });

    await server.start();

    // Keep alive — handle graceful shutdown
    const shutdown = async () => {
      console.log("\nShutting down...");
      await server.stop();
      await client.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    await client.close();
    fatal(err instanceof Error ? err.message : String(err));
  }
}
