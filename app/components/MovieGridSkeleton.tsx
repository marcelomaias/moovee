export default function MovieGridSkeleton() {
  return (
    <>
      {/* Fake navbar */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "rgba(14,17,23,0.97)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className="w-28 h-5 rounded-sm animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
          <div
            className="w-48 h-8 rounded-sm animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div
          className="w-40 h-5 rounded-sm animate-pulse mb-8"
          style={{ background: "var(--bg-secondary)" }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div
                className="aspect-[2/3]"
                style={{ background: "var(--bg-card)" }}
              />
              <div className="pt-2 space-y-1.5">
                <div
                  className="h-3 rounded-sm w-4/5"
                  style={{ background: "var(--bg-secondary)" }}
                />
                <div
                  className="h-2.5 rounded-sm w-1/3"
                  style={{ background: "var(--bg-secondary)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
