"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Lock,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

type PixResult = {
  orderId: string;
  paymentId: string;
  total: number;
  qrCodeBase64: string;
  pixCopyPaste: string;
  expirationDate: string;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch {
      // Ignora erro de rede no ViaCEP
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name,
            email,
            cpfCnpj,
            phone,
            cep,
            address,
            number,
            complement,
            neighborhood,
            city,
            state,
          },
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar o checkout.");
      }

      setPixData(data);
      clearCart();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.pixCopyPaste) return;
    await navigator.clipboard.writeText(pixData.pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#07070b", color: "#fff", paddingBottom: 60 }}>
      <style>{`
        .ck-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .ck-header { padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 36px; display: flex; justify-content: space-between; align-items: center; }
        .ck-grid { display: grid; grid-template-columns: 1.35fr 0.85fr; gap: 32px; align-items: start; }
        @media (max-width: 860px) { .ck-grid { grid-template-columns: 1fr; } }
        .ck-card { background: #101018; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; }
        .ck-card h2 { margin: 0 0 20px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 10px; }
        .ck-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 600px) { .ck-row { grid-template-columns: 1fr; } }
        .ck-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .ck-field label { font-size: 13px; color: #a1a1aa; font-weight: 500; }
        .ck-field input { background: #09090f; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; color: #fff; font-size: 14px; outline: none; transition: border 0.2s; }
        .ck-field input:focus { border-color: #8b5cf6; }
        .ck-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: #fca5a5; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; }
        .ck-submit { width: 100%; padding: 16px; border-radius: 12px; border: none; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .ck-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .ck-summary-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .ck-pix-box { max-width: 540px; margin: 20px auto; text-align: center; background: #101018; border: 1px solid rgba(139,92,246,0.35); border-radius: 18px; padding: 36px 28px; }
        .ck-qr-img { width: 240px; height: 240px; margin: 20px auto; background: #fff; padding: 12px; border-radius: 14px; display: block; }
        .ck-copy-input { width: 100%; background: #09090f; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px; color: #d4d4d8; font-size: 12px; margin-bottom: 14px; word-break: break-all; }
      `}</style>

      <div className="ck-wrap">
        <header className="ck-header">
          <Link className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
            <span className="brand-mark">
              <Zap size={22} fill="currentColor" />
            </span>
            <span>
              MEGA <b>IMPORTS</b>
            </span>
          </Link>

          <Link href="/" style={{ color: "#a1a1aa", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> Voltar para a loja
          </Link>
        </header>

        {pixData ? (
          <div className="ck-pix-box">
            <QrCode size={42} color="#a78bfa" style={{ margin: "0 auto 12px" }} />
            <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Pedido Gerado com Sucesso!</h1>
            <p style={{ color: "#a1a1aa", fontSize: 14, margin: "0 0 16px" }}>
              Escaneie o QR Code abaixo no aplicativo do seu banco ou use o Pix Copia e Cola.
            </p>

            <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>
              {formatBRL(pixData.total)}
            </div>

            <img
              className="ck-qr-img"
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
              alt="QR Code Pix Asaas"
            />

            <div className="ck-copy-input">{pixData.pixCopyPaste}</div>

            <button type="button" onClick={handleCopyPix} className="ck-submit">
              {copied ? (
                <>
                  Código Pix Copiado! <Check size={18} />
                </>
              ) : (
                <>
                  Copiar Código Pix (Copia e Cola) <Copy size={18} />
                </>
              )}
            </button>

            <p style={{ color: "#71717a", fontSize: 12, marginTop: 20 }}>
              Código do Pedido: #{pixData.orderId.slice(0, 8)} • O Asaas gerou a cobrança com sucesso.
            </p>
          </div>
        ) : cart.length === 0 ? (
          <div className="ck-pix-box">
            <ShoppingBag size={48} color="#71717a" style={{ margin: "0 auto 12px" }} />
            <h2>Seu carrinho está vazio</h2>
            <p style={{ color: "#a1a1aa", marginBottom: 24 }}>
              Adicione equipamentos ao seu carrinho antes de finalizar a compra.
            </p>
            <Link href="/" className="ck-submit" style={{ textDecoration: "none" }}>
              Explorar Produtos
            </Link>
          </div>
        ) : (
          <div className="ck-grid">
            <form className="ck-card" onSubmit={handleSubmit}>
              <h2>
                <Lock size={18} color="#a78bfa" /> Dados para Pagamento e Entrega
              </h2>

              {error && <div className="ck-error">{error}</div>}

              <div className="ck-field">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="ck-row">
                <div className="ck-field">
                  <label>CPF ou CNPJ (apenas números) *</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                  />
                </div>

                <div className="ck-field">
                  <label>WhatsApp / Telefone com DDD *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="ck-field">
                <label>E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="ck-row">
                <div className="ck-field">
                  <label>CEP *</label>
                  <input
                    type="text"
                    required
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                  />
                </div>

                <div className="ck-field">
                  <label>Número *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 120"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="ck-field">
                <label>Endereço (Rua / Avenida) *</label>
                <input
                  type="text"
                  required
                  placeholder="Rua das Flores"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="ck-row">
                <div className="ck-field">
                  <label>Bairro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Centro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>

                <div className="ck-field">
                  <label>Complemento (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Apto, Bloco, Casa"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                  />
                </div>
              </div>

              <div className="ck-row">
                <div className="ck-field">
                  <label>Cidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="ck-field">
                  <label>Estado (UF) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="ck-submit" disabled={loading}>
                {loading ? "Gerando Pix seguro..." : `Gerar Pix de ${formatBRL(cartTotal)}`}
              </button>
            </form>

            <aside className="ck-card">
              <h2>
                <ShoppingBag size={18} color="#a78bfa" /> Resumo do Pedido
              </h2>

              {cart.map((item) => (
                <div key={item.id} className="ck-summary-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <small style={{ color: "#a1a1aa" }}>
                      {item.quantity}x de {formatBRL(item.price)}
                    </small>
                  </div>
                  <div style={{ fontWeight: 700, color: "#a78bfa" }}>
                    {formatBRL(item.price * item.quantity)}
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 18, fontWeight: 800 }}>
                <span>Total a pagar:</span>
                <span style={{ color: "#a78bfa" }}>{formatBRL(cartTotal)}</span>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: "rgba(139,92,246,0.08)", borderRadius: 10, fontSize: 12, color: "#c4b5fd", display: "flex", gap: 10, alignItems: "center" }}>
                <ShieldCheck size={20} />
                <span>
                  Pagamento instantâneo via Pix processado pelo Asaas com validação de preço e estoque no servidor.
                </span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}