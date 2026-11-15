import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

export const metadata: Metadata = { title: "Nordstone Bank | Banking made for life", description: "Simple, quick and secure digital banking for life across borders." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><LanguageProvider><LanguageSwitcher/>{children}</LanguageProvider></body></html>; }
