"use client";

import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function CartSidebar() {
  const { cart, isCartOpen, closeCart, removeFromCart, updateQuantity, cartTotal, cartCount } =
    useCart();

  if (!isCartOpen) return null;

  const handleGoToCheckout = () => {
    closeCart();
    window.location.href = "/checkout";
  };

  return (
    <>
      <style>{`
        .mi-cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 9998;
          animation: miFadeIn 0.2s ease-out;
        }
        .mi-cart-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 420px;
          background: #0b0b10;
          border-left: 1px solid rgba(139, 92, 246, 0.25);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          color: #fff;
          animation: miSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes miFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes miSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .mi-cart-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0f0f17;
        }
        .mi-cart-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .mi-cart-badge {
          background: #7c3aed;
          color: #fff;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .mi-cart-close {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .mi-cart-close:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .mi-cart-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .mi-cart-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #888;
          gap: 12px;
          padding: 40px 20px;
        }
        .mi-cart-item {
          display: flex;
          gap: 14px;
          background: #13131d;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 14px;
        }
        .mi-cart-thumb {
          width: 72px;
          height: 72px;
          border-radius: 8px;
          object-fit: cover;
          background: #1c1c28;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #555;
        }
        .mi-cart-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .mi-cart-name {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mi-cart-unit {
          font-size: 12px;
          color: #9ca3af;
        }
        .mi-cart-subtotal {
          font-size: 14px;
          font-weight: 700;
          color: #a78bfa;
          margin-top: 2px;
        }
        .mi-cart-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
        }
        .mi-qty-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #09090d;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 3px 6px;
        }
        .mi-qty-btn {
          background: transparent;
          border: none;
          color: #fff;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 4px;
        }
        .mi-qty-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }
        .mi-qty-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .mi-qty-num {
          font-size: 13px;
          font-weight: 600;
          min-width: 18px;
          text-align: center;
        }
        .mi-remove-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #f87171;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .mi-remove-btn:hover {
          background: rgba(239, 68, 68, 0.22);
        }
        .mi-cart-footer {
          padding: 20px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: #0f0f17;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mi-cart-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 18px;
          font-weight: 700;
        }
        .mi-cart-total-val {
          color: #a78bfa;
          font-size: 20px;
        }
        .mi-checkout-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: filter 0.2s;
        }
        .mi-checkout-btn:hover {
          filter: brightness(1.12);
        }
      `}</style>

      <div className="mi-cart-overlay" onClick={closeCart} />

      <aside className="mi-cart-drawer" aria-label="Carrinho de compras">
        <div className="mi-cart-header">
          <h3 className="mi-cart-title">
            <ShoppingBag size={18} />
            Seu Carrinho
            <span className="mi-cart-badge">{cartCount}</span>
          </h3>
          <button
            type="button"
            onClick={closeCart}
            className="mi-cart-close"
            aria-label="Fechar carrinho"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mi-cart-body">
          {cart.length === 0 ? (
            <div className="mi-cart-empty">
              <ShoppingBag size={48} opacity={0.4} />
              <p>Seu carrinho está vazio no momento.</p>
              <small>Adicione produtos da loja para continuar.</small>
            </div>
          ) : (
            cart.map((item) => {
              const itemSubtotal = item.price * item.quantity;

              return (
                <div key={item.id} className="mi-cart-item">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="mi-cart-thumb"
                    />
                  ) : (
                    <div className="mi-cart-thumb">
                      <ShoppingBag size={24} />
                    </div>
                  )}

                  <div className="mi-cart-info">
                    <div>
                      <h4 className="mi-cart-name">{item.name}</h4>
                      <div className="mi-cart-unit">
                        Unitário: {formatBRL(item.price)}
                      </div>
                      <div className="mi-cart-subtotal">
                        Total do item: {formatBRL(itemSubtotal)}
                      </div>
                    </div>

                    <div className="mi-cart-controls">
                      <div className="mi-qty-box">
                        <button
                          type="button"
                          className="mi-qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="mi-qty-num">{item.quantity}</span>
                        <button
                          type="button"
                          className="mi-qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="mi-remove-btn"
                        aria-label={`Remover ${item.name}`}
                      >
                        <Trash2 size={14} />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="mi-cart-footer">
            <div className="mi-cart-total-row">
              <span>Valor Total:</span>
              <span className="mi-cart-total-val">{formatBRL(cartTotal)}</span>
            </div>

            <button
              type="button"
              onClick={handleGoToCheckout}
              className="mi-checkout-btn"
            >
              Ir para o Checkout <ArrowRight size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}