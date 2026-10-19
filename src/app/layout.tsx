import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "@neondatabase/auth-ui/css";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Daily Practice — My Discipline Journal",
  description: "A calm, thoughtful space to build habits, nourish yourself, and reflect.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
