import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opening Tasks - Cyber Security",
  description: "Opening task submissions for Ms. Budhu's Cyber Security classes"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
