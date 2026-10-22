import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, Search, Compass } from "lucide-react";

export default function NotFound() {
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

        <Button variant="outline" asChild size="sm" className="rounded-full text-xs">
          <Link href="/hackathons">Explore Hackathons</Link>
        </Button>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-6">
        <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
          <Compass className="size-10 stroke-[1.75]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary">
            404 Error • Page Missing
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Lost in the Codebase?
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page, hackathon challenge, project showcase, or builder profile you are looking for doesn&apos;t exist or has moved.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild className="rounded-full gap-2 shadow-sm px-6 text-xs h-10 font-bold">
            <Link href="/hackathons">
              <Search className="size-3.5" />
              Browse Active Hackathons
            </Link>
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
        © {new Date().getFullYear()} hack4win.online • The Global Hackathon Platform for Top Builders.
      </footer>
    </div>
  );
}
