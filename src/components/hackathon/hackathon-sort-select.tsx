"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown, Loader2 } from "lucide-react";

export function HackathonSortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get("sort") || "default";

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === "default") {
      params.delete("sort");
    } else {
      params.set("sort", newSort);
    }

    startTransition(() => {
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin text-primary" />
      ) : (
        <ArrowUpDown className="size-3.5 text-muted-foreground" />
      )}
      <span className="font-medium hidden sm:inline">Sort:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        disabled={isPending}
        className="rounded-xl border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
      >
        <option value="default">Default (Live → Upcoming → Ended)</option>
        <option value="deadline">Ending Soonest (Deadline)</option>
        <option value="prize">Highest Prize Pool</option>
        <option value="newest">Recently Published</option>
      </select>
    </div>
  );
}
