import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Nordstone Bank | Banking made for life", description: "Simple, quick and secure digital banking for life across borders." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
