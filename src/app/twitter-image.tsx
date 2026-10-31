import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Hack4Win | Global Hackathon Platform (hack4win.online)";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #09090b 70%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* Subtle grid pattern background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.15,
            backgroundImage:
              "radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#6366f1 1px, #09090b 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 20px 20px",
          }}
        />

        {/* Top Header Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 24px",
            borderRadius: "9999px",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            fontSize: "20px",
            fontWeight: 700,
            color: "#a5b4fc",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          <span>🏆 The Premier Hackathon Arena</span>
        </div>

        {/* Hero Branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: "84px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              background: "linear-gradient(to right, #ffffff, #c7d2fe, #818cf8)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Hack4Win
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#e2e8f0",
              maxWidth: "900px",
              lineHeight: 1.3,
            }}
          >
            Build, Showcase & Win World-Class Coding Competitions
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              maxWidth: "800px",
            }}
          >
            Connect with elite builders • Transparent 50-point rubric • Instant cash bounties
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "24px",
              fontWeight: 800,
              color: "#60a5fa",
            }}
          >
            hack4win.online
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: "18px",
              color: "#cbd5e1",
              fontWeight: 600,
            }}
          >
            <span>✨ AI Challenges</span>
            <span>•</span>
            <span>🌐 Web3 Bounties</span>
            <span>•</span>
            <span>🎓 Campus Editions</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
