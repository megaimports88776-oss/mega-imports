"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Copy, Lock, ShieldCheck, ShoppingBag, Zap, Smartphone, MessageCircle
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();

  // ==========================================
  // CONFIGURAÇÕES DO PIX E WHATSAPP DO DONO
  // ==========================================
  const WHATSAPP_NUMERO = "5511999999999"; // Coloque o DDI + DDD + Número (apenas números)
  const CHAVE_PIX = "email-do-dono@gmail.com"; 
  const NOME_RECEBEDOR = "Nome do Dono da Loja";
  // ==========================================

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
  const [orderResult, setOrderResult] = useState<any | null>(null);
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
    } catch {}
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
          customer: { name, email, cpfCnpj, phone, cep, address, number, complement, neighborhood, city, state },
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao processar o checkout.");

      setOrderResult(data);
      clearCart();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar pedido.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    await navigator.clipboard.writeText(CHAVE_PIX);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const openWhatsApp = () => {
    const idCurto = orderResult.orderId.slice(0, 8);
    const mensagem = `Olá! Acabei de fazer um pedido na loja.%0A%0A*Nº do Pedido:* #${idCurto}%0A*Nome:* ${name}%0A*Valor:* ${formatBRL(orderResult.total)}%0A%0ASegue o meu comprovante de pagamento Pix abaixo:`;
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${mensagem}`, "_blank");
  };

  return (
    <main style={{ minHeight: "100vh", background: "#07070b", color: "#fff", paddingBottom: 60 }}>
      <style>{`
        .ck-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .ck-header { padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 36px; display: flex; justify-content: space-between; align-items: center; }
        .ck-grid { display: grid; grid-template-columns: 1.35fr 0.85fr; gap: 32px; align-items: start; }
        @media (max-width: 860px) { .ck-grid { grid-template-columns: 1fr; } }
        .ck-card { background: #101018; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; margin-bottom: 24px;}
        .ck-card h2 { margin: 0 0 20px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 10px; }
        .ck-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 600px) { .ck-row { grid-template-columns: 1fr; } }
        .ck-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .ck-field label { font-size: 13px; color: #a1a1aa; font-weight: 500; }
        .ck-field input { background: #09090f; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; color: #fff; font-size: 14px; outline: none; transition: border 0.2s; width: 100%; }
        .ck-field input:focus { border-color: #8b5cf6; }
        .ck-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: #fca5a5; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; }
        .ck-submit { width: 100%; padding: 16px; border-radius: 12px; border: none; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: opacity 0.2s;}
        .ck-submit:hover { opacity: 0.9; }
        .ck-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .wpp-btn { background: #25D366; color: white; border: none; border-radius: 12px; padding: 16px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; transition: background 0.2s; margin-top: 16px; }
        .wpp-btn:hover { background: #128C7E; }

        .ck-summary-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .ck-pix-box { max-width: 540px; margin: 20px auto; text-align: center; background: #101018; border: 1px solid rgba(139,92,246,0.35); border-radius: 18px; padding: 36px 28px; }
      `}</style>

      <div className="ck-wrap">
        <header className="ck-header">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
            <span style={{ color: "#a78bfa" }}><Zap size={22} fill="currentColor" /></span>
            <span>MEGA <b>IMPORTS</b></span>
          </Link>
          <Link href="/" style={{ color: "#a1a1aa", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> Voltar
          </Link>
        </header>

        {orderResult ? (
          <div className="ck-pix-box">
            <Check size={52} color="#10b981" style={{ margin: "0 auto 12px" }} />
            <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Pedido Reservado!</h1>
            <p style={{ color: "#a1a1aa", fontSize: 14, margin: "0 0 16px" }}>Para confirmar sua compra, realize o pagamento via Pix.</p>
            
            <div style={{ fontSize: 28, fontWeight: 900, color: "#a78bfa", marginBottom: 24 }}>
              {formatBRL(orderResult.total)}
            </div>

            <div style={{ background: "#09090f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "left" }}>
              <p style={{ margin: "0 0 8px", color: "#a1a1aa", fontSize: 14 }}>Chave Pix (E-mail/CPF/CNPJ/Telefone):</p>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{CHAVE_PIX}</div>
              <div style={{ fontSize: 14, color: "#71717a" }}>Nome: {NOME_RECEBEDOR}</div>
            </div>

            <button type="button" onClick={handleCopyPix} className="ck-submit" style={{ background: "#3f3f46", color: "#fff" }}>
              {copied ? <>Chave Copiada! <Check size={18} /></> : <>Copiar Chave Pix <Copy size={18} /></>}
            </button>

            <div style={{ margin: "24px 0", height: 1, background: "rgba(255,255,255,0.08)" }} />

            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Já fez o pagamento?</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 16 }}>Envie o comprovante no nosso WhatsApp para liberarmos o envio imediatamente.</p>
            
            <button type="button" onClick={openWhatsApp} className="wpp-btn">
              <MessageCircle size={22} />
              Enviar Comprovante
            </button>
            
            <p style={{ color: "#71717a", fontSize: 12, marginTop: 24 }}>Pedido: #{orderResult.orderId.slice(0, 8)}</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="ck-pix-box">
            <h2>Carrinho vazio</h2>
            <Link href="/" className="ck-submit" style={{ textDecoration: "none" }}>Explorar Produtos</Link>
          </div>
        ) : (
          <div className="ck-grid">
            <form onSubmit={handleSubmit}>
              
              <div className="ck-card">
                <h2><Lock size={18} color="#a78bfa" /> Dados de Entrega</h2>
                {error && <div className="ck-error">{error}</div>}

                <div className="ck-field">
                  <label>Nome Completo *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="ck-row">
                  <div className="ck-field"><label>CPF/CNPJ *</label><input type="text" required value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} /></div>
                  <div className="ck-field"><label>Telefone *</label><input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                <div className="ck-field">
                  <label>E-mail *</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="ck-row">
                  <div className="ck-field"><label>CEP *</label><input type="text" required value={cep} onChange={(e) => setCep(e.target.value)} onBlur={handleCepBlur} /></div>
                  <div className="ck-field"><label>Número *</label><input type="text" required value={number} onChange={(e) => setNumber(e.target.value)} /></div>
                </div>
                <div className="ck-field">
                  <label>Endereço *</label>
                  <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="ck-row">
                  <div className="ck-field"><label>Bairro *</label><input type="text" required value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} /></div>
                  <div className="ck-field"><label>Complemento</label><input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} /></div>
                </div>
                <div className="ck-row">
                  <div className="ck-field"><label>Cidade *</label><input type="text" required value={city} onChange={(e) => setCity(e.target.value)} /></div>
                  <div className="ck-field"><label>Estado (UF) *</label><input type="text" required maxLength={2} value={state} onChange={(e) => setState(e.target.value)} /></div>
                </div>
              </div>

              <div className="ck-card">
                <h2><ShieldCheck size={18} color="#a78bfa" /> Forma de Pagamento</h2>
                <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <Smartphone size={24} color="#a78bfa" />
                  <div>
                    <strong style={{ display: "block", color: "#fff" }}>Pagamento Direto via Pix</strong>
                    <span style={{ fontSize: 13, color: "#a1a1aa" }}>Sem taxas adicionais. Chave exibida na próxima tela.</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="ck-submit" disabled={loading}>
                {loading ? "Processando..." : `Finalizar Pedido de ${formatBRL(cartTotal)}`}
              </button>
            </form>

            <aside className="ck-card">
              <h2><ShoppingBag size={18} color="#a78bfa" /> Resumo do Pedido</h2>
              {cart.map((item) => (
                <div key={item.id} className="ck-summary-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <small style={{ color: "#a1a1aa" }}>{item.quantity}x de {formatBRL(item.price)}</small>
                  </div>
                  <div style={{ fontWeight: 700, color: "#a78bfa" }}>{formatBRL(item.price * item.quantity)}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 18, fontWeight: 800 }}>
                <span>Total a pagar:</span>
                <span style={{ color: "#a78bfa" }}>{formatBRL(cartTotal)}</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}