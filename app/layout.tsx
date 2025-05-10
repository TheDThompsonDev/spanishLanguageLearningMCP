import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spanish Learning MCP",
  description:
    "A Model Context Protocol for Spanish language learning applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
