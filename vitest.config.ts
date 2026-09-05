import { defineConfig } from "vitest/config";
import path from "node:path";
import dotenv from "dotenv";

// Load the test environment (gitignored) before any test module imports,
// so that src/lib/db/client.ts connects to the dedicated test database.
dotenv.config({ path: ".env.test" });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "./tests"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});