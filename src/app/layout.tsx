import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Curbside Shade Mapper",
  description: "Find hour-by-hour shade for your mobile ice cream cart.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${geist.variable} h-full antialiased`}><body className="min-h-full">{children}</body></html>;
}
