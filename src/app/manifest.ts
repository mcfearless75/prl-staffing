import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PRISM — PRL Site Solutions",
    short_name: "PRISM",
    description: "Workforce Intelligence & Compliance Platform",
    // /login routes each user on: contractors to /portal, staff to /, and
    // signed-out users stay put. It is also the start_url existing installs
    // were made with, so keeping it preserves their app identity.
    start_url: "/login",
    scope: "/",
    lang: "en-GB",
    dir: "ltr",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#005f8c",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
  };
}
