import type { Metadata } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";
import "./globals.css";

const headingFont = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  display: "swap",
});

const bodyFont = Poppins({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IVAO Portugal Hub",
  description: "Operations, events, and pilot resources for IVAO Portugal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark min-h-full">
      <body
        className={`${headingFont.variable} ${bodyFont.variable} antialiased bg-[color:var(--background)] text-[color:var(--text-primary)]`}
      >
        {children}
      </body>
    </html>
  );
}
