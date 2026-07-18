import type { Metadata } from "next";
import {
  Pirata_One,
  Cinzel,
  Cormorant_Garamond,
  EB_Garamond,
  IM_Fell_English_SC,
  Inter,
  Space_Grotesk,
  Sora,
  JetBrains_Mono,
  Manrope,
  Geist,
  IBM_Plex_Mono,
} from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
// Pirate / Vintage Theme Fonts
const pirataOne = Pirata_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pirata-one",
});
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
});
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant-garamond",
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-eb-garamond",
});
const imFellEnglishSc = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-im-fell-english-sc",
});
// Modern Theme Fonts
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
});
// Minimal Theme Fonts
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-geist",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});
// General UI font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});
export const metadata: Metadata = {
  title: "Atlas — History, Placed",
  description: "Explore the world's history through an interactive map. Discover civilizations, empires, legendary figures, and historical events connected across time.",
  openGraph: {
    title: "Atlas — History, Placed",
    description: "Explore the world's history through an interactive map. Discover civilizations, empires, legendary figures, and historical events connected across time.",
    images: [
      {
        url: "/og_image.jpg",
        width: 1200,
        height: 630,
        alt: "Atlas — History, Placed",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlas — History, Placed",
    description: "Explore the world's history through an interactive map. Discover civilizations, empires, legendary figures, and historical events connected across time.",
    images: ["/og_image.jpg"],
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    pirataOne.variable,
    cinzel.variable,
    cormorantGaramond.variable,
    ebGaramond.variable,
    imFellEnglishSc.variable,
    sora.variable,
    spaceGrotesk.variable,
    jetbrainsMono.variable,
    manrope.variable,
    geist.variable,
    ibmPlexMono.variable,
    inter.variable,
  ].join(" ");
  return (
    <html lang="en">
      <body className={fontVariables}>
        {children}
      </body>
    </html>
  );
}
