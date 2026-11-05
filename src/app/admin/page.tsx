import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  ArrowLeft,
  Image as ImageIcon, 
  ClipboardList, // Ícone para os pedidos adicionado aqui!
} from "lucide-react";

import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase, user } = await requireAdmin();

  const [
    { count: productCount, error: productsError },
    { count: categoryCount, error: categoriesError },
    { count: activeCount, error: activeError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  async function logout() {
    "use server";

    const { requireAdmin: unused } = await import("@/lib/supabase/admin");
    void unused;

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  const stats = [
    {
      label: "Produtos cadastrados",
      value: productsError ? "—" : String(productCount ?? 0),
      icon: Package,
    },
    {
      label: "Categorias",
      value: categoriesError ? "—" : String(categoryCount ?? 0),
      icon: LayoutDashboard,
    },
    {
      label: "Produtos ativos",
      value: activeError ? "—" : String(activeCount ?? 0),
      icon: ShoppingBag,
    },
  ];

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-dashboard-brand">
          MEGA <span>IMPORTS</span>
        </Link>

        <div className="admin-sidebar-label">GERENCIAMENTO</div>

        <Link href="/admin" className="admin-nav-item admin-nav-active">
          <LayoutDashboard size={19} />
          Visão geral
        </Link>

        <Link href="/admin/produtos" className="admin-nav-item">
          <Package size={19} />
          Produtos
        </Link>

        <Link href="/admin/categorias" className="admin-nav-item">
          <ShoppingBag size={19} />
          Categorias
        </Link>

        {/* --- NOVA LIGAÇÃO PARA PEDIDOS AQUI --- */}
        <Link href="/admin/pedidos" className="admin-nav-item">
          <ClipboardList size={19} />
          Pedidos
        </Link>
        {/* -------------------------------------- */}

        <Link href="/admin/banner" className="admin-nav-item">
          <ImageIcon size={19} />
          Banners
        </Link>

        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <div className="admin-user-avatar">
              <ShieldCheck size={20} />
            </div>
            <div className="admin-user-details">
              <strong>Administrador</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <form action={logout}>
            <button className="admin-logout-button" type="submit">
              <LogOut size={17} />
              Sair do painel
            </button>
          </form>

          <Link href="/" className="admin-store-link">
            <ArrowLeft size={16} />
            Voltar para a loja
          </Link>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-breadcrumb">MEGA IMPORTS / ADMINISTRAÇÃO</p>
            <h1>Visão geral</h1>
          </div>
          <span className="admin-status">
            <span className="admin-status-dot" />
            Área administrativa
          </span>
        </header>

        <div className="admin-welcome">
          <div>
            <p className="admin-welcome-label">BEM-VINDO DE VOLTA</p>
            <h2>Seu negócio, sob controle.</h2>
            <p>
              Gerencie o catálogo e acompanhe os dados da sua loja.
            </p>
          </div>
          <div className="admin-welcome-icon">
            <LayoutDashboard size={38} />
          </div>
        </div>

        <div className="admin-stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article className="admin-stat-card" key={stat.label}>
                <div className="admin-stat-icon">
                  <Icon size={22} />
                </div>
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
              </article>
            );
          })}
        </div>

        <section className="admin-content-card">
          <div className="admin-content-heading">
            <div>
              <p className="admin-welcome-label">CATÁLOGO</p>
              <h2>Gerencie seus produtos</h2>
            </div>
            <Package size={26} />
          </div>

          <p className="admin-content-description">
            Acesse a área de produtos para preparar seu catálogo.
          </p>

          <Link href="/admin/produtos" className="admin-primary-link">
            Abrir gerenciamento de produtos
            <span>→</span>
          </Link>
        </section>
      </section>
    </main>
  );
}