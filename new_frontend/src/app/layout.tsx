import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import AlertProvider from "@/components/AlertProvider";
import OverlayProvider from "@/components/OverlayProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VaultTune",
  description: "VaultTune is your self-hosted music streaming platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-0">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen bg-indigo-950`}
        style={{background: ""}}
      >
        <div className="absolute w-screen h-screen -z-1 bg-indigo-950" ></div>
        <AlertProvider>
          <OverlayProvider>
          {children}
          </OverlayProvider>
        </AlertProvider>
        
      </body>
    </html>
  );
}
