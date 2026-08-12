"use client";

import { Skeleton } from "@/shared/ui/Skeleton";

interface MovementSkeletonProps {
  count?: number;
  viewMode?: "cards" | "table";
}

export function MovementSkeleton({ count = 6, viewMode = "cards" }: MovementSkeletonProps) {
  if (viewMode === "table") {
    return (
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: count }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-28" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-card relative overflow-hidden p-4"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-[var(--slate-200)]" />
          <div className="ml-3 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
