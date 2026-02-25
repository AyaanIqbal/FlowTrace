import { build, context } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const watch = process.argv.includes("--watch");
const root = resolve(process.cwd());
const outdir = resolve(root, "dist");

mkdirSync(outdir, { recursive: true });
cpSync(resolve(root, "src/manifest.json"), resolve(outdir, "manifest.json"));
cpSync(resolve(root, "src/popup.html"), resolve(outdir, "popup.html"));

const options = {
  entryPoints: {
    background: resolve(root, "src/background.ts"),
    content: resolve(root, "src/content.ts"),
    popup: resolve(root, "src/popup.ts"),
  },
  outdir,
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: true,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching extension build...");
} else {
  await build(options);
}
