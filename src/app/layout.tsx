import type { Metadata, Viewport } from "next";
import { Archivo, Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";

// Display / headlines. Archivo is a variable font — omit `weight` to load the range.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

// Data / labels / stats / serials. Chakra Petch is static — declare the weights we use.
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

// Body / UI.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://proplayturf.com"),
  title: {
    default: "Pro Play Turf — Stake Your Turf",
    template: "%s · Pro Play Turf",
  },
  description:
    "The premier arena for competitive 1v1 EA Sports FC. Enter skill-based leagues, stream every match, and get paid the moment you finish on top.",
};

export const viewport: Viewport = {
  themeColor: "#050B17",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${chakra.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
