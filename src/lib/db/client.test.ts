import { describe, expect, it } from "vitest";
import { checkDbConnection } from "@/lib/db/client";

describe("database connection", () => {
  it("connects to the test database", async () => {
    await expect(checkDbConnection()).resolves.toBe("Database connected");
  });

  it("reports a missing DATABASE_URL without connecting", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(checkDbConnection()).resolves.toBe("No DATABASE_URL environment variable");
    } finally {
      process.env.DATABASE_URL = original;
    }
  });
});