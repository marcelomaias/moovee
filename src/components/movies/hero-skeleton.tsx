import { Skeleton } from "@/components/ui/skeleton";

export function HeroSkeleton() {
  return (
    <div className="h-[50vh] min-h-[320px] w-full sm:h-[60vh]">
      <Skeleton className="size-full rounded-none" />
    </div>
  );
}