export default function PropertyDetailLoading() {
  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-10">
      <div className="aspect-4/3 animate-pulse rounded-lg bg-canvas-alt sm:aspect-16/9" />
      <div className="mt-6 max-w-md space-y-3">
        <div className="h-8 w-3/4 animate-pulse rounded-xs bg-canvas-alt" />
        <div className="h-6 w-1/3 animate-pulse rounded-xs bg-canvas-alt" />
        <div className="h-4 w-1/2 animate-pulse rounded-xs bg-canvas-alt" />
      </div>
    </div>
  );
}
