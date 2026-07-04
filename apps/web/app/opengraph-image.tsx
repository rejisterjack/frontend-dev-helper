import { ImageResponse } from "next/og";
import { TOOL_COUNT } from "@/data/tools";

export const runtime = "edge";
export const alt = `FrontendDevHelper — ${TOOL_COUNT} visual debugging tools in one browser extension`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image.
 *
 * Rendered on-demand via the edge runtime. Matches the new brand palette
 * (cyan → violet gradient on near-black) and uses the brand mark + wordmark
 * composition. The font is system sans-serif because edge OG can't easily
 * load Geist without bundling the font binary; the visual identity comes
 * from the logo + color + composition.
 */
export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background:
          "radial-gradient(ellipse 1000px 600px at 20% 0%, rgba(34,211,238,0.18) 0%, transparent 60%), radial-gradient(ellipse 800px 500px at 90% 100%, rgba(167,139,250,0.14) 0%, transparent 60%), #08090C",
        color: "#F5F6F8",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Brand row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, #22D3EE 0%, #A78BFA 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            color: "#08090C",
            fontWeight: 800,
          }}
        >
          {"</>"}
        </div>
        <div
          style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          FrontendDevHelper
        </div>
      </div>

      {/* Headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
            maxWidth: 1000,
          }}
        >
          Master your frontend craft.
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#8B909C",
            lineHeight: 1.3,
            maxWidth: 900,
          }}
        >
          {`${TOOL_COUNT} visual debugging tools in one Manifest V3 browser extension. Free & open source.`}
        </div>
      </div>

      {/* Footer row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 22,
          color: "#5A6070",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", gap: 28 }}>
          <span>MIT licensed</span>
          <span>Manifest V3</span>
          <span>No telemetry</span>
        </div>
        <div>frontenddevhelper.com</div>
      </div>
    </div>,
    size,
  );
}
