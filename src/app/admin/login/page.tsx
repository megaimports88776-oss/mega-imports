
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Não foi possível entrar. Confira seus dados."
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-glow" />

      <section className="admin-login-card">
        <Link href="/" className="admin-login-brand">
          MEGA <span>IMPORTS</span>
        </Link>

        <div className="admin-login-icon">
          <LockKeyhole size={27} />
        </div>

        <p className="admin-login-eyebrow">ÁREA RESTRITA</p>

        <h1>Painel administrativo</h1>

        <p className="admin-login-description">
          Entre com sua conta autorizada para gerenciar a loja.
        </p>

        <form onSubmit={handleLogin} className="admin-login-form">
          <label htmlFor="admin-email">E-mail</label>

          <div className="admin-login-input-wrap">
            <Mail size={18} />

            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <label htmlFor="admin-password">Senha</label>

          <div className="admin-login-input-wrap">
            <LockKeyhole size={18} />

            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
            />

            <button
              type="button"
              className="admin-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword ? "Ocultar senha" : "Mostrar senha"
              }
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {error && (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle
                  className="admin-login-spinner"
                  size={19}
                />
                Entrando...
              </>
            ) : (
              "Entrar no painel"
            )}
          </button>
        </form>

        <Link href="/" className="admin-login-back">
          ← Voltar para a loja
        </Link>
      </section>
    </main>
  );
}
