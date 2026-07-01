import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Frontend Dev Helper — 40+ visual debugging tools in one browser extension";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image.
 *
 * Replaces the static `/og-image.png` referenced in the old layout. This is
 * rendered on-demand by Next.js at build/runtime via the edge runtime; no
 * binary asset needs to be checked in.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/metadata-opengraph-image
 */
export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "80px",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", marginBottom: "32px" }}>
        <span
          style={{
            fontSize: "28px",
            fontWeight: 600,
            padding: "8px 20px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          Free &amp; Open Source
        </span>
      </div>
      <div
        style={{
          fontSize: "76px",
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          marginBottom: "24px",
        }}
      >
        Frontend Dev Helper
      </div>
      <div style={{ fontSize: "34px", color: "#a3a3a3", lineHeight: 1.3 }}>
        40+ visual debugging tools in one
        <br />
        Manifest V3 browser extension.
      </div>
      <div style={{ marginTop: "auto", fontSize: "24px", color: "#525252" }}>
        frontenddevhelper.com
      </div>
    </div>,
    size,
  );
}
