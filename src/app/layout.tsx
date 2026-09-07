import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Archivo } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

/* Quiet body face. Does no shouting, on purpose. */
const body = Geist({ variable: "--font-body", subsets: ["latin"] });

/* Terminal face. This design is largely data labels, so the mono carries more
   of the personality than the body copy does. */
const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

/* Display. An industrial grotesque with signage roots: reads like something
   stencilled on a bay door rather than another startup wordmark. */
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Invems - Warehouse Management Made Simple",
  description: "Modern warehouse & inventory management. Scan, track, order, and manage your entire operation from one platform.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
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
