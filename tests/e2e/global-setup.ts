import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
  dotenv.config({ path: ".env.test" });

  // Playwright's loader does not resolve tsconfig `paths`, so seeding runs in a
  // child Node process via tsx (which does resolve them). `.env.test` values
  // are inherited through `process.env`.
  execFileSync(
    process.execPath,
    ["--import", "tsx", path.join(process.cwd(), "tests/helpers/seed-cli.ts")],
    { stdio: "inherit", env: process.env },
  );
}