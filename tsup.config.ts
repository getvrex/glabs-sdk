import { defineConfig } from "tsup";

export default defineConfig([
  // Library entries
  {
    entry: ["src/index.ts", "src/types/index.ts", "src/openai-server.ts"],
    format: ["esm"],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: false,
    treeshake: true,
    minify: false,
    external: [],
  },
  // CLI entry
  {
    entry: ["src/cli/cli-entry.ts"],
    outDir: "dist/cli",
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    minify: false,
    banner: { js: "#!/usr/bin/env node" },
    external: [],
  },
]);
