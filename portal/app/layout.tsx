import "./globals.css";
import type { Metadata } from "next";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "BOW Sports Capital Portal",
  description: "Class portal for BOW Sports Capital students and staff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
