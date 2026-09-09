import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono, Unbounded } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import BootScript from "@/components/motion/BootScript";
import BootGate from "@/components/motion/BootGate";
import ScrollReveals from "@/components/motion/ScrollReveals";
import "./globals.css";

/* Quiet body face. Neutral by design and largely absent from generated sites,
   which is the point: the display face should do the talking. */
const body = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* Data face. Plex has industrial drafting heritage rather than code-editor
   heritage, which suits bay numbers and part codes. */
const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/* Display. Wide, geometric and heavy: the opposite move from the condensed
   pass, so headlines read as machined rather than as signage. */
const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Invems - Warehouse Management Made Simple",
  description: "Modern warehouse & inventory management. Scan, track, order, and manage your entire operation from one platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* First thing in the document: it decides whether the gate shows,
            synchronously, before anything below has been parsed. */}
        <BootScript />
        <BootGate />
        <ScrollReveals />
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
