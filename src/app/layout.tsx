import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { CartSidebar } from "@/components/CartSidebar";

export const metadata: Metadata = {
  title: "MAGEIMPORTS — Seu próximo nível começa aqui",
  description: "Hardware, periféricos e acessórios gamer selecionados para elevar seu setup.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: { title: "MEGAIMPORTS", description: "Seu próximo nível começa aqui", type: "website" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          {children}
          <CartSidebar />
        </CartProvider>
      </body>
    </html>
  );
}