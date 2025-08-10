import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { ClientLayout } from "@/components/layout/client-layout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Consulta Electoral PPD | Partido Popular Democrático",
  description: "Plataforma de inteligencia de campaña para recopilar datos de opinión de votantes y gestionar operaciones de campo para el Partido Popular Democrático de Puerto Rico.",
  keywords: ["PPD", "Partido Popular Democrático", "Puerto Rico", "encuestas", "campaña electoral"],
  authors: [{ name: "PPD Digital Team" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: "#0d5bdd",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Consulta Electoral PPD",
    description: "Plataforma de inteligencia de campaña para el Partido Popular Democrático",
    locale: "es_PR",
    type: "website",
  },
  robots: {
    index: false, // Don't index political campaign data
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" dir="ltr">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <div className="min-h-screen flex flex-col">
          <ErrorBoundary>
            <AuthProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </AuthProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
