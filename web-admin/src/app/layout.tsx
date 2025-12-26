import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Control de Accesos",
  description: "Dashboard de control de accesos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900`}>
        {/* Fondo tipo tablet (azul suave) */}
        <div className="min-h-screen bg-gradient-to-b from-blue-100/60 via-slate-50 to-white">
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
