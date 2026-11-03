
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  FolderPlus,
  Tags,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  async function createCategory(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const slug = makeSlug(name);

    if (!name || !slug) {
      redirect("/admin/categorias?status=invalid");
    }

    const { error } = await supabase.from("categories").insert({
      name,
      slug,
      description: description || null,
      is_active: formData.get("is_active") === "on",
      sort_order: 0,
    });

    if (error) {
      console.error("Erro ao criar categoria:", error.message);
      redirect(
        `/admin/categorias?status=${error.code === "23505" ? "duplicate" : "error"}`
      );
    }

    redirect("/admin/categorias?status=created");
  }

  async function toggleCategory(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const active = formData.get("active") === "true";

    if (!id) redirect("/admin/categorias?status=invalid");

    const { error } = await supabase
      .from("categories")
      .update({ is_active: !active })
      .eq("id", id);

    if (error) {
      console.error("Erro ao alterar categoria:", error.message);
      redirect("/admin/categorias?status=error");
    }

    redirect("/admin/categorias?status=updated");
  }

  async function deleteCategory(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");

    if (!id) redirect("/admin/categorias?status=invalid");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir categoria:", error.message);
      redirect("/admin/categorias?status=delete-error");
    }

    redirect("/admin/categorias?status=deleted");
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug, description, is_active, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const messages: Record<string, string> = {
    created: "Categoria criada com sucesso!",
    updated: "Status da categoria atualizado.",
    deleted: "Categoria excluída.",
    duplicate: "Já existe uma categoria com esse slug. Escolha outro nome.",
    invalid: "Informe um nome válido para a categoria.",
    error: "Não foi possível salvar a categoria. Verifique as permissões e as colunas da tabela.",
    "delete-error": "Não foi possível excluir. Essa categoria pode estar vinculada a produtos.",
  };

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-back-link">
          <ArrowLeft size={18} /> Voltar ao painel
        </Link>
        <span className="admin-user-label">MEGA IMPORTS · ADMIN</span>
      </header>

      <section className="admin-content">
        <div className="admin-page-heading">
          <div>
            <p className="admin-login-eyebrow">GERENCIAMENTO</p>
            <h1>Categorias</h1>
            <p>Organize os departamentos da sua loja.</p>
          </div>
          <div className="admin-stat-icon">
            <Tags size={25} />
          </div>
        </div>

        {params.status && messages[params.status] && (
          <p className="admin-notice" role="status">
            {messages[params.status]}
          </p>
        )}

        <div className="admin-management-grid">
          <section className="admin-panel-card">
            <h2><FolderPlus size={20} /> Nova categoria</h2>

            <form action={createCategory} className="admin-management-form">
              <label htmlFor="category-name">Nome *</label>
              <input
                id="category-name"
                name="name"
                placeholder="Ex.: Smartphones"
                maxLength={80}
                required
              />

              <label htmlFor="category-description">Descrição</label>
              <textarea
                id="category-description"
                name="description"
                placeholder="Descrição opcional da categoria"
                rows={3}
                maxLength={500}
              />

              <label className="admin-checkbox-label">
                <input type="checkbox" name="is_active" defaultChecked />
                Categoria ativa
              </label>

              <button type="submit" className="admin-primary-button">
                <FolderPlus size={18} /> Criar categoria
              </button>
            </form>
          </section>

          <section className="admin-panel-card">
            <div className="admin-list-heading">
              <h2>Categorias cadastradas</h2>
              <span>{categories?.length ?? 0} total</span>
            </div>

            {categoriesError ? (
              <p className="admin-error-message">
                Não foi possível carregar as categorias. Verifique as permissões do Supabase.
              </p>
            ) : !categories?.length ? (
              <div className="admin-empty-state">
                <Tags size={32} />
                <strong>Nenhuma categoria ainda</strong>
                <p>Use o formulário para cadastrar a primeira categoria.</p>
              </div>
            ) : (
              <div className="admin-category-list">
                {categories.map((category) => (
                  <article key={category.id} className="admin-category-item">
                    <div className="admin-category-info">
                      <strong>{category.name}</strong>
                      <span>/{category.slug}</span>
                      {category.description && (
                        <p>{category.description}</p>
                      )}
                      <span className={category.is_active ? "admin-status-active" : "admin-status-inactive"}>
                        {category.is_active ? (
                          <><CheckCircle2 size={14} /> Ativa</>
                        ) : (
                          <><XCircle size={14} /> Inativa</>
                        )}
                      </span>
                    </div>

                    <div className="admin-category-actions">
                      <form action={toggleCategory}>
                        <input type="hidden" name="id" value={category.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(category.is_active)}
                        />
                        <button type="submit" className="admin-secondary-button">
                          {category.is_active ? "Desativar" : "Ativar"}
                        </button>
                      </form>

                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={category.id} />
                        <button
                          type="submit"
                          className="admin-danger-button"
                          aria-label={`Excluir categoria ${category.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
