import { Skeleton } from "@/components/ui/skeleton";

export function MovieGridSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[2/3] w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}