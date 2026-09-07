"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateApprovalSettings } from "@/app/rooms/actions";

type ApprovalMode = "majority" | "unanimous" | "percentage";

interface Props {
  roomId: string;
  mode: ApprovalMode;
  threshold: number | null;
}

export function RoomSettings({ roomId, mode, threshold }: Props) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<ApprovalMode>(mode);
  const [thresholdValue, setThresholdValue] = useState(
    String(threshold ?? 50),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = () => {
    setError(null);
    setSaving(true);
    const body = new FormData();
    body.set("mode", selectedMode);
    if (selectedMode === "percentage") body.set("threshold", thresholdValue);
    void updateApprovalSettings(roomId, body).then((result) => {
      setSaving(false);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="approval-mode">Approval mode</Label>
          <select
            id="approval-mode"
            value={selectedMode}
            onChange={(e) =>
              setSelectedMode(e.target.value as ApprovalMode)
            }
            className="mt-2 block w-full rounded-lg border bg-background px-4 py-3 text-base"
          >
            <option value="majority">Majority</option>
            <option value="unanimous">Unanimous</option>
            <option value="percentage">Percentage</option>
          </select>
        </div>
        {selectedMode === "percentage" ? (
          <div>
            <Label htmlFor="approval-threshold">Threshold (%)</Label>
            <Input
              id="approval-threshold"
              type="number"
              min={1}
              max={100}
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              className="mt-2 h-11 text-base"
            />
          </div>
        ) : null}
      </div>
      {selectedMode === "percentage" ? (
        <p className="text-sm text-muted-foreground">
          A suggestion is approved once the share of approvals reaches this
          percentage of members. The suggester&apos;s own vote counts.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {selectedMode === "majority"
            ? "A suggestion is approved once more than half of members approve."
            : "A suggestion is approved only when every member approves."}
        </p>
      )}
      {error ? <p className="text-base text-destructive">{error}</p> : null}
      <Button disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}