import { lazy, Suspense, type ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Wraps a dynamic import in Suspense for route-level code splitting. */
export function lazyPage<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const LazyComponent = lazy(factory);
  return function LazyPage(props: P) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
