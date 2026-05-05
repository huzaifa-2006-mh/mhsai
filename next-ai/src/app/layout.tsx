import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MHS AI | Neural Vision Intelligence",
  description: "Next-generation Air Writing and Age Detection powered by Neural Networks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
