import type { Metadata } from "next";
import { Bebas_Neue, DM_Mono, Syne } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "G-Balancer | AI Grid Stabilization",
  description: "Predict supply. Forecast demand. Stabilize the grid in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${dmMono.variable} ${syne.variable} h-full antialiased font-syne`}
    >
      <body className="min-h-full flex flex-col font-syne">{children}</body>
    </html>
  );
}
