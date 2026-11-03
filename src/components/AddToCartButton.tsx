"use client";

import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
  stock: number;
};

export function AddToCartButton({ product, stock }: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000); // Volta ao normal após 2s
  };

  if (stock <= 0) {
    return (
      <button className="add-button" disabled title="Sem estoque no momento">
        Sem estoque <ShoppingBag size={16} />
      </button>
    );
  }

  return (
    <button className="add-button" onClick={handleAdd} style={{ backgroundColor: added ? "#10b981" : "", color: added ? "#000" : "" }}>
      {added ? "Adicionado!" : "Adicionar ao Carrinho"}
      {added ? <Check size={16} /> : <ShoppingBag size={16} />}
    </button>
  );
}