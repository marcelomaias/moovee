export type ApprovalMode = "majority" | "unanimous" | "percentage";

/**
 * Pure threshold check. `A` = approval count, `N` = current active member count.
 * Approval-only — there is no reject path, a suggestion either reaches the
 * threshold or expires.
 */
export function evaluateApproval(
  mode: ApprovalMode,
  threshold: number | null,
  approvals: number,
  memberCount: number,
): boolean {
  switch (mode) {
    case "majority":
      return approvals > memberCount / 2;
    case "unanimous":
      return approvals >= memberCount;
    case "percentage":
      return (
        threshold != null &&
        threshold > 0 &&
        approvals / memberCount >= threshold / 100
      );
  }
}

/** Lazy expiry: a row with `expiresAt` in the past is treated as expired. */
export function isExpired(expiresAt: Date, now: number = Date.now()): boolean {
  return expiresAt.getTime() < now;
}