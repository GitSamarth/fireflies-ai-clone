import type { Metadata } from "next";
import Shell from "@/components/Shell";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = { title: "Fireflies Clone — Meeting notes", description: "Meeting library, transcripts, AI summaries and action items" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ToastProvider><Shell>{children}</Shell></ToastProvider></body>
    </html>
  );
}
