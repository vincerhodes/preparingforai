import { ImageResponse } from "next/og";
import { site } from "@/site.config";

export const alt = site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a",
        padding: 80,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "#f8fafc",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {site.name}
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 36,
          color: "#fbbf24",
          textAlign: "center",
        }}
      >
        {site.tagline}
      </div>
    </div>,
    { ...size },
  );
}
