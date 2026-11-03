
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
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

function money(value: number | string | null) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  async function createProduct(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "");
    const price = Number(formData.get("price"));
    const compareRaw = String(formData.get("compare_at_price") ?? "").trim();
    const compareAtPrice = compareRaw ? Number(compareRaw) : null;
    const stock = Number(formData.get("stock") ?? 0);
    const isActive = formData.get("is_active") === "on";
    const isFeatured = formData.get("is_featured") === "on";
    const image = formData.get("image");

    if (
      !name ||
      !makeSlug(name) ||
      !Number.isFinite(price) ||
      price < 0 ||
      (compareAtPrice !== null &&
        (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)) ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      redirect("/admin/produtos?status=invalid");
    }

    let imagePath: string | null = null;

    if (image instanceof File && image.size > 0) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 5 * 1024 * 1024;

      if (!allowedTypes.includes(image.type) || image.size > maxSize) {
        redirect("/admin/produtos?status=invalid-image");
      }

      const extension =
        image.type === "image/png"
          ? "png"
          : image.type === "image/webp"
            ? "webp"
            : "jpg";

      const fileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, image, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro no upload da imagem:", uploadError.message);
        redirect("/admin/produtos?status=upload-error");
      }

      imagePath = filePath;
    }

    const { error } = await supabase.from("products").insert({
      name,
      slug: makeSlug(name),
      description: description || null,
      category_id: categoryId || null,
      price,
      compare_at_price: compareAtPrice,
      stock,
      image_url: imagePath,
      is_active: isActive,
      is_featured: isFeatured,
      sort_order: 0,
    });

    if (error) {
      console.error("Erro ao cadastrar produto:", error.message);
      redirect(
        `/admin/produtos?status=${error.code === "23505" ? "duplicate" : "error"}`,
      );
    }

    redirect("/admin/produtos?status=created");
  }

  async function updateProduct(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "");
    const price = Number(formData.get("price"));
    const compareRaw = String(formData.get("compare_at_price") ?? "").trim();
    const compareAtPrice = compareRaw ? Number(compareRaw) : null;
    const stock = Number(formData.get("stock"));

    if (
      !id ||
      !name ||
      !makeSlug(name) ||
      !Number.isFinite(price) ||
      price < 0 ||
      (compareAtPrice !== null &&
        (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)) ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      redirect("/admin/produtos?status=invalid");
    }

    const { error } = await supabase
      .from("products")
      .update({
        name,
        slug: makeSlug(name),
        description: description || null,
        category_id: categoryId || null,
        price,
        compare_at_price: compareAtPrice,
        stock,
      })
      .eq("id", id);

    if (error) {
      console.error("Erro ao editar produto:", error.message);
      redirect(
        `/admin/produtos?status=${error.code === "23505" ? "duplicate" : "error"}`,
      );
    }

    redirect("/admin/produtos?status=updated");
  }

  async function toggleProduct(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const active = formData.get("active") === "true";

    if (!id) redirect("/admin/produtos?status=invalid");

    const { error } = await supabase
      .from("products")
      .update({ is_active: !active })
      .eq("id", id);

    if (error) {
      console.error("Erro ao alterar produto:", error.message);
      redirect("/admin/produtos?status=error");
    }

    redirect("/admin/produtos?status=updated");
  }

  async function deleteProduct(formData: FormData) {
    "use server";

    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");

    if (!id) redirect("/admin/produtos?status=invalid");

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir produto:", error.message);
      redirect("/admin/produtos?status=error");
    }

    redirect("/admin/produtos?status=deleted");
  }

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,slug,description,category_id,price,compare_at_price,image_url,stock,is_active,is_featured,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id,name")
      .order("name", { ascending: true }),
  ]);

  const categoryNames = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  const imagePaths = (products ?? [])
    .map((product) => product.image_url)
    .filter(
      (path): path is string =>
        typeof path === "string" &&
        path.length > 0 &&
        !path.startsWith("http"),
    );

  const signedUrls = new Map<string, string>();

  if (imagePaths.length > 0) {
    const { data: signedImages } = await supabase.storage
      .from("product-images")
      .createSignedUrls([...new Set(imagePaths)], 3600);

    for (const image of signedImages ?? []) {
      if (image.path && image.signedUrl) {
        signedUrls.set(image.path, image.signedUrl);
      }
    }
  }

  const messages: Record<string, string> = {
    created: "Produto cadastrado com sucesso!",
    updated: "Produto atualizado com sucesso!",
    deleted: "Produto excluído com sucesso!",
    duplicate: "Já existe um produto com esse nome ou slug.",
    invalid: "Confira os campos e informe valores válidos.",
    "invalid-image": "Use uma imagem JPG, PNG ou WebP de até 5 MB.",
    "upload-error": "Não foi possível enviar a imagem. Confira o bucket e as permissões.",
    error: "Não foi possível salvar. Confira as permissões e as colunas da tabela.",
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
            <p className="admin-login-eyebrow">GERENCIAMENTO DA LOJA</p>
            <h1>Produtos</h1>
            <p>Cadastre e gerencie o catálogo da sua loja.</p>
          </div>
          <div className="admin-stat-icon">
            <Package size={25} />
          </div>
        </div>

        {params.status && messages[params.status] && (
          <p className="admin-notice" role="status">
            {messages[params.status]}
          </p>
        )}

        <div className="admin-management-grid">
          <section className="admin-panel-card">
            <h2>
              <Plus size={20} /> Novo produto
            </h2>

            <form action={createProduct} className="admin-management-form">
              <label htmlFor="product-name">Nome do produto *</label>
              <input
                id="product-name"
                name="name"
                placeholder="Ex.: Smartphone 256 GB"
                maxLength={120}
                required
              />

              <label htmlFor="product-description">Descrição</label>
              <textarea
                id="product-description"
                name="description"
                placeholder="Detalhes do produto"
                rows={4}
                maxLength={5000}
              />

              <label htmlFor="product-category">Categoria</label>
              <select id="product-category" name="category_id" defaultValue="">
                <option value="">Sem categoria</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div className="admin-product-fields">
                <div>
                  <label htmlFor="product-price">Preço (R$) *</label>
                  <input
                    id="product-price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="99.90"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product-compare-price">
                    Preço anterior (R$)
                  </label>
                  <input
                    id="product-compare-price"
                    name="compare_at_price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="129.90"
                  />
                </div>
              </div>

              <label htmlFor="product-stock">Estoque *</label>
              <input
                id="product-stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                required
              />

              <label htmlFor="product-image">Imagem do produto</label>
              <input
                id="product-image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
              <small>JPG, PNG ou WebP. Máximo de 5 MB.</small>

              <label className="admin-checkbox-label">
                <input type="checkbox" name="is_active" defaultChecked />
                Produto ativo na loja
              </label>
              <label className="admin-checkbox-label">
                <input type="checkbox" name="is_featured" />
                Destacar na página inicial
              </label>

              <button type="submit" className="admin-primary-button">
                <Plus size={18} /> Cadastrar produto
              </button>
            </form>
          </section>

          <section className="admin-panel-card">
            <div className="admin-list-heading">
              <h2>Produtos cadastrados</h2>
              <span>{products?.length ?? 0} total</span>
            </div>

            {productsError || categoriesError ? (
              <p className="admin-error-message">
                Não foi possível carregar todos os dados. Confira as permissões
                e as tabelas no Supabase.
              </p>
            ) : !products?.length ? (
              <div className="admin-empty-state">
                <Package size={32} />
                <strong>Nenhum produto cadastrado</strong>
                <p>Use o formulário para cadastrar o primeiro produto.</p>
              </div>
            ) : (
              <div className="admin-product-list">
                {products.map((product) => {
                  const imageUrl = product.image_url
                    ? product.image_url.startsWith("http")
                      ? product.image_url
                      : signedUrls.get(product.image_url)
                    : null;

                  return (
                    <article key={product.id} className="admin-product-item">
                      <div className="admin-product-preview">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={product.name} />
                        ) : (
                          <Package size={28} />
                        )}
                      </div>

                      <div className="admin-product-info">
                        <strong>{product.name}</strong>
                        <span>
                          {categoryNames.get(product.category_id) ??
                            "Sem categoria"}
                        </span>
                        <b>{money(product.price)}</b>
                        {product.compare_at_price != null && (
                          <span>
                            Preço anterior: {money(product.compare_at_price)}
                          </span>
                        )}
                        <span>Estoque: {product.stock}</span>
                        <span
                          className={
                            product.is_active
                              ? "admin-status-active"
                              : "admin-status-inactive"
                          }
                        >
                          {product.is_active ? "Ativo" : "Inativo"}
                        </span>

                        <details className="admin-product-edit">
                          <summary>
                            <Save size={15} /> Editar produto
                          </summary>
                          <form
                            action={updateProduct}
                            className="admin-management-form"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={product.id}
                            />

                            <label>Nome *</label>
                            <input
                              name="name"
                              defaultValue={product.name}
                              maxLength={120}
                              required
                            />

                            <label>Descrição</label>
                            <textarea
                              name="description"
                              defaultValue={product.description ?? ""}
                              rows={3}
                              maxLength={5000}
                            />

                            <label>Categoria</label>
                            <select
                              name="category_id"
                              defaultValue={product.category_id ?? ""}
                            >
                              <option value="">Sem categoria</option>
                              {(categories ?? []).map((category) => (
                                <option
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </option>
                              ))}
                            </select>

                            <label>Preço (R$) *</label>
                            <input
                              name="price"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={product.price}
                              required
                            />

                            <label>Preço anterior (R$)</label>
                            <input
                              name="compare_at_price"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={product.compare_at_price ?? ""}
                            />

                            <label>Estoque *</label>
                            <input
                              name="stock"
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={product.stock}
                              required
                            />

                            <button
                              type="submit"
                              className="admin-primary-button"
                            >
                              <Save size={16} /> Salvar alterações
                            </button>
                          </form>
                        </details>

                        <div className="admin-category-actions">
                          <form action={toggleProduct}>
                            <input
                              type="hidden"
                              name="id"
                              value={product.id}
                            />
                            <input
                              type="hidden"
                              name="active"
                              value={String(product.is_active)}
                            />
                            <button
                              type="submit"
                              className="admin-secondary-button"
                            >
                              {product.is_active ? (
                                <>
                                  <EyeOff size={15} /> Desativar
                                </>
                              ) : (
                                <>
                                  <Eye size={15} /> Ativar
                                </>
                              )}
                            </button>
                          </form>

                          <form action={deleteProduct}>
                            <input
                              type="hidden"
                              name="id"
                              value={product.id}
                            />
                            <button
                              type="submit"
                              className="admin-danger-button"
                              aria-label={`Excluir ${product.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
