import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | Hack4Win",
  description: "Sign in or complete account onboarding for Hack4Win hackathon platform.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
