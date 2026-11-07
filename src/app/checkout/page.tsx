"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Copy, Lock, ShieldCheck, ShoppingBag, Zap, CreditCard, Smartphone, QrCode
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [installments, setInstallments] = useState(1);
  
  const [ccName, setCcName] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [ccExpiry, setCcExpiry] = useState(""); 
  const [ccCvv, setCcCvv] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any | null>(null);
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
      let creditCardData = null;

      if (paymentMethod === "CREDIT_CARD") {
        const [month, year] = ccExpiry.split("/");
        if (!month || !year || year.length !== 4) {
          throw new Error("A validade do cartão deve estar no formato MM/AAAA (ex: 12/2029)");
        }
        creditCardData = {
          holderName: ccName,
          number: ccNumber,
          expiryMonth: month,
          expiryYear: year,
          ccv: ccCvv
        };
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          installmentCount: installments,
          customer: { name, email, cpfCnpj, phone, cep, address, number, complement, neighborhood, city, state },
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
          creditCard: creditCardData
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao processar o checkout.");

      setPaymentResult(data);
      clearCart();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (paymentResult?.pixCopyPaste) {
      await navigator.clipboard.writeText(paymentResult.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
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
        .ck-field input, .ck-field select { background: #09090f; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; color: #fff; font-size: 14px; outline: none; transition: border 0.2s; width: 100%; }
        .ck-field input:focus, .ck-field select:focus { border-color: #8b5cf6; }
        .ck-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: #fca5a5; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; }
        .ck-submit { width: 100%; padding: 16px; border-radius: 12px; border: none; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: opacity 0.2s;}
        .ck-submit:hover { opacity: 0.9; }
        .ck-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .ck-summary-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .ck-pix-box { max-width: 540px; margin: 20px auto; text-align: center; background: #101018; border: 1px solid rgba(139,92,246,0.35); border-radius: 18px; padding: 36px 28px; }
        
        .method-tabs { display: flex; gap: 16px; margin-bottom: 24px; }
        .method-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.08); background: #09090f; color: #a1a1aa; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .method-btn.active { border-color: #8b5cf6; background: rgba(139,92,246,0.1); color: #fff; }
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

        {paymentResult ? (
          <div className="ck-pix-box">
            {paymentResult.method === "PIX" ? (
              <>
                <QrCode size={52} color="#10b981" style={{ margin: "0 auto 12px" }} />
                <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Pedido Gerado!</h1>
                <p style={{ color: "#a1a1aa", fontSize: 14, margin: "0 0 16px" }}>Abra o app do seu banco e pague via Pix.</p>
                
                <div style={{ fontSize: 28, fontWeight: 900, color: "#10b981", marginBottom: 24 }}>
                  {formatBRL(paymentResult.total)}
                </div>

                {paymentResult.qrCodeBase64 && (
                  <div style={{ background: "#fff", padding: 16, borderRadius: 12, display: "inline-block", marginBottom: 24 }}>
                    <img 
                      src={`data:image/jpeg;base64,${paymentResult.qrCodeBase64}`} 
                      alt="QR Code Pix" 
                      style={{ width: 220, height: 220, display: "block" }} 
                    />
                  </div>
                )}

                <div style={{ background: "#09090f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left" }}>
                  <p style={{ margin: "0 0 8px", color: "#a1a1aa", fontSize: 13 }}>Pix Copia e Cola:</p>
                  <div style={{ fontSize: 13, color: "#fff", wordBreak: "break-all" }}>{paymentResult.pixCopyPaste}</div>
                </div>

                <button type="button" onClick={handleCopyPix} className="ck-submit" style={{ background: "#10b981", color: "#fff" }}>
                  {copied ? <>Código Copiado! <Check size={18} /></> : <>Copiar Código Pix <Copy size={18} /></>}
                </button>
                
                <p style={{ color: "#71717a", fontSize: 12, marginTop: 24 }}>Pedido: #{paymentResult.orderId.slice(0, 8)}</p>
              </>
            ) : (
              <>
                <Check size={52} color="#10b981" style={{ margin: "0 auto 16px" }} />
                <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Pagamento Aprovado!</h1>
                <p style={{ color: "#a1a1aa", fontSize: 15, margin: "0 0 24px" }}>O seu pagamento por cartão foi recebido e processado com sucesso.</p>
                <Link href="/" className="ck-submit" style={{ textDecoration: "none" }}>Voltar à Loja</Link>
                <p style={{ color: "#71717a", fontSize: 12, marginTop: 24 }}>Pedido: #{paymentResult.orderId.slice(0, 8)}</p>
              </>
            )}
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
                
                <div className="method-tabs">
                  <button type="button" className={`method-btn ${paymentMethod === "PIX" ? "active" : ""}`} onClick={() => setPaymentMethod("PIX")}>
                    <Smartphone size={18} /> Pix
                  </button>
                  <button type="button" className={`method-btn ${paymentMethod === "CREDIT_CARD" ? "active" : ""}`} onClick={() => setPaymentMethod("CREDIT_CARD")}>
                    <CreditCard size={18} /> Cartão
                  </button>
                </div>

                {paymentMethod === "CREDIT_CARD" && (
                  <div style={{ background: "#0c0c14", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="ck-field">
                      <label>Nome impresso no Cartão *</label>
                      <input type="text" required={paymentMethod === "CREDIT_CARD"} value={ccName} onChange={(e) => setCcName(e.target.value.toUpperCase())} placeholder="NOME COMPLETO" />
                    </div>
                    <div className="ck-field">
                      <label>Número do Cartão *</label>
                      <input type="text" required={paymentMethod === "CREDIT_CARD"} value={ccNumber} onChange={(e) => setCcNumber(e.target.value)} placeholder="0000 0000 0000 0000" maxLength={19} />
                    </div>
                    <div className="ck-row">
                      <div className="ck-field">
                        <label>Validade (MM/AAAA) *</label>
                        <input type="text" required={paymentMethod === "CREDIT_CARD"} value={ccExpiry} onChange={(e) => setCcExpiry(e.target.value)} placeholder="12/2029" maxLength={7} />
                      </div>
                      <div className="ck-field">
                        <label>CVV *</label>
                        <input type="text" required={paymentMethod === "CREDIT_CARD"} value={ccCvv} onChange={(e) => setCcCvv(e.target.value)} placeholder="123" maxLength={4} />
                      </div>
                    </div>
                    
                    <div className="ck-field" style={{ marginTop: 16 }}>
                      <label>Parcelamento *</label>
                      <select 
                        value={installments} 
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        required={paymentMethod === "CREDIT_CARD"}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                          const val = cartTotal / num;
                          if (num > 1 && val < 5) return null;
                          return (
                            <option key={num} value={num}>
                              {num}x de {formatBRL(val)} {num === 1 ? "à vista" : "sem juros"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {paymentMethod === "PIX" && (
                  <p style={{ color: "#a1a1aa", fontSize: 14 }}>Você poderá escanear o QR Code ou usar o Pix Copia e Cola na próxima tela. A aprovação é imediata.</p>
                )}
              </div>

              <button type="submit" className="ck-submit" disabled={loading}>
                {loading ? "Processando Segurança..." : paymentMethod === "PIX" ? `Finalizar Pedido de ${formatBRL(cartTotal)}` : `Pagar ${formatBRL(cartTotal)} no Cartão`}
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