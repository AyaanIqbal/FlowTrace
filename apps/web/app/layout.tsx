import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThirdLayer Demo",
  description: "Browser workflow graph + memory store demo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
