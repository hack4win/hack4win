import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, KeyRound, HardDrive, ShieldCheck, CheckCircle2 } from "lucide-react";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { EmailTestSection } from "@/components/admin/email-test-section";

/**
 * Admin Infrastructure Settings Page (Server Component)
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Infrastructure Settings | Admin Console",
  description: "Neon PostgreSQL and S3 configuration settings",
};

export default async function AdminSettingsPage() {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const dbUrl = process.env.DATABASE_URL || "";
  const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ":••••••••@");

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Infrastructure & Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connected Neon services, object storage parameters, and authentication configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Neon Postgres Configuration */}
        <Card className="border shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Database className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Neon Serverless PostgreSQL</CardTitle>
                  <CardDescription>Primary relational datastore</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-xs gap-1">
                <CheckCircle2 className="size-3" /> Healthy
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Region</span>
              <p className="font-medium">AWS ap-southeast-1 (Singapore)</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Connection String (Pooled)</span>
              <p className="font-mono text-xs p-2.5 rounded-lg bg-muted text-muted-foreground break-all">
                {maskedDbUrl}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Database Schemas</span>
              <p className="font-medium">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">public</span> (domain data) &middot;{" "}
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">neon_auth</span> (Better Auth engine)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Neon Auth Configuration */}
        <Card className="border shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Neon Auth Service</CardTitle>
                  <CardDescription>Managed authentication engine</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-xs gap-1">
                <CheckCircle2 className="size-3" /> Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Base Auth Endpoint</span>
              <p className="font-mono text-xs p-2.5 rounded-lg bg-muted text-muted-foreground break-all">
                {process.env.NEON_AUTH_BASE_URL || "https://ep-little-dew-b3gw3u3i.neonauth.c-4.ap-southeast-1.aws.neon.tech/do4win/auth"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Enabled Identity Providers</span>
              <div className="flex gap-2 pt-1">
                <Badge variant="secondary" className="text-xs">Google OAuth</Badge>
                <Badge variant="secondary" className="text-xs">Email OTP (Passwordless)</Badge>
                <Badge variant="secondary" className="text-xs">Email & Password</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* S3 Compatible Storage */}
        <Card className="border shadow-xs md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <HardDrive className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Neon S3-Compatible Object Storage</CardTitle>
                  <CardDescription>File and project asset storage</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-xs gap-1">
                <CheckCircle2 className="size-3" /> Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Storage Bucket</span>
              <p className="font-mono text-xs p-2 rounded bg-muted">{process.env.S3_BUCKET || "do4win"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Access Level</span>
              <p className="font-mono text-xs p-2 rounded bg-muted">public_read</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Region</span>
              <p className="font-mono text-xs p-2 rounded bg-muted">{process.env.AWS_REGION || "ap-southeast-1"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Outgoing Mail Delivery & Diagnostic Testing */}
        <EmailTestSection adminEmail={session.user.email} />
      </div>
    </main>
  );
}
