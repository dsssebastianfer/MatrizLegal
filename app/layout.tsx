import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matriz Legal",
  description: "Gestión de Matriz de Identificación y Evaluación de Requisitos Legales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
