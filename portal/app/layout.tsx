import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BOW Sports Capital Portal",
  description: "Class portal for BOW Sports Capital students and staff"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="portal-body">
        <a className="skip-link" href="#app-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
