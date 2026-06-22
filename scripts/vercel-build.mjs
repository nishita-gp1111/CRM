import { spawnSync } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const bin = (name) =>
  path.join("node_modules", ".bin", isWindows ? `${name}.cmd` : name);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: isWindows,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.BOOTSTRAP_DATABASE_ON_BUILD === "true") {
  if (!process.env.DATABASE_URL) {
    console.error("BOOTSTRAP_DATABASE_ON_BUILD is true but DATABASE_URL is missing.");
    process.exit(1);
  }
  console.info("Running production database migrations...");
  run(bin("prisma"), ["migrate", "deploy"]);
  console.info("Running production seed...");
  run(bin("tsx"), ["prisma/seed.ts"]);
}

run(bin("prisma"), ["generate"]);
run(bin("next"), ["build"]);
