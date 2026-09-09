import type { MetadataRoute } from "next";

// Web app manifest: lets phones install True Review to the home screen with
// the TR icon and open it full-screen, the first step towards the store apps.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "True Review",
    short_name: "True Review",
    description: "Real people. Honest reviews. Every kind of business, all across America.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf4e8",
    theme_color: "#0f1f3d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
