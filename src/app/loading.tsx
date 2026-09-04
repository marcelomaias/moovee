import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </main>
  );
}
