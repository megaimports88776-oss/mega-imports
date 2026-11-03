"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export function CartHeaderButton() {
  const { cartCount, toggleCart } = useCart();

  return (
    <>
      <style>{`
        header.header {
          position: sticky !important;
          top: 0 !important;
          z-index: 900 !important;
          background: rgba(8, 8, 12, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <button
        type="button"
        className="cart"
        onClick={toggleCart}
        aria-label="Abrir carrinho"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <ShoppingBag size={18} />
        <span>Carrinho</span>
        <b>{cartCount}</b>
      </button>
    </>
  );
}