"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Runtime Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Header */}
      <header className="border-b px-6 sm:px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl tracking-tight hover:opacity-85 transition-opacity"
        >
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Trophy className="size-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">
            Hack4Win<span className="text-muted-foreground text-sm font-normal">.online</span>
          </span>
        </Link>
      </header>

      {/* Main Error Card */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="size-18 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="size-9 stroke-[2]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-destructive">
            Application Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred while processing this request. Our engineering logs have been notified.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/70 bg-muted/30 py-1 px-2.5 rounded-lg inline-block">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="rounded-full gap-2 shadow-sm px-6 text-xs h-10 font-bold cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            Try Again
          </Button>

          <Button variant="outline" asChild className="rounded-full gap-2 text-xs h-10 font-semibold">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Return Home
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} hack4win.online • Reliable, High-Performance Platform for Developers.
      </footer>
    </div>
  );
}
