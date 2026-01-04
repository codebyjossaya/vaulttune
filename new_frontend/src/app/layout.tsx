import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}
        style={{background: "linear-gradient(0deg, rgb(0, 0, 0), #051f11)"}}
      >
        <div className="absolute w-screen h-screen -z-1 bg-indigo-950" ></div>
        {children}
      </body>
    </html>
  );
}
