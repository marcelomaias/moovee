import { describe, expect, it } from "vitest";
import { evaluateApproval, isExpired } from "@/lib/rooms/approval";

describe("evaluateApproval", () => {
  it("majority: strictly more than half", () => {
    expect(evaluateApproval("majority", null, 1, 1)).toBe(true);
    expect(evaluateApproval("majority", null, 1, 2)).toBe(false);
    expect(evaluateApproval("majority", null, 2, 2)).toBe(true);
    expect(evaluateApproval("majority", null, 2, 3)).toBe(true);
    expect(evaluateApproval("majority", null, 3, 5)).toBe(true);
    expect(evaluateApproval("majority", null, 1, 5)).toBe(false);
  });

  it("unanimous: every member must approve", () => {
    expect(evaluateApproval("unanimous", null, 1, 1)).toBe(true);
    expect(evaluateApproval("unanimous", null, 2, 3)).toBe(false);
    expect(evaluateApproval("unanimous", null, 3, 3)).toBe(true);
    expect(evaluateApproval("unanimous", null, 0, 2)).toBe(false);
  });

  it("percentage: approvals/memberCount meet or exceed the threshold", () => {
    expect(evaluateApproval("percentage", 60, 3, 5)).toBe(true);
    expect(evaluateApproval("percentage", 60, 2, 5)).toBe(false);
    expect(evaluateApproval("percentage", 100, 4, 5)).toBe(false);
    expect(evaluateApproval("percentage", 100, 5, 5)).toBe(true);
  });

  it("percentage with a missing threshold never approves", () => {
    expect(evaluateApproval("percentage", null, 5, 5)).toBe(false);
  });
});

describe("isExpired", () => {
  it("treats a past expiresAt as expired", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    expect(isExpired(past, Date.parse("2026-02-01T00:00:00Z"))).toBe(true);
  });

  it("treats a future expiresAt as not expired, and the exact instant as valid", () => {
    const future = new Date("2026-02-01T00:00:00Z");
    expect(isExpired(future, Date.parse("2026-01-01T00:00:00Z"))).toBe(false);
    expect(isExpired(future, Date.parse("2026-02-01T00:00:00Z"))).toBe(false);
  });
});