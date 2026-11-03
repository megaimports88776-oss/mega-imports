import PromoBanner from "@/components/PromoBanner";
import Link from "next/link";
import { CartHeaderButton } from "@/components/CartHeaderButton";
import { AddToCartButton } from "@/components/AddToCartButton";
import {
  ArrowRight,
  ChevronRight,
  Cpu,
  Gamepad2,
  Headphones,
  Menu,
  Monitor,
  Search,
  ShieldCheck,
  Truck,
  Zap,
  PackageOpen,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  stock: number;
  is_featured: boolean;
  sort_order: number;
  categories?: { name: string } | { name: string }[] | null;
  signedImage?: string | null;
};

const categoryIcons = [Cpu, Monitor, Headphones, Gamepad2];

function formatPrice(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function getCategoryName(product: Product) {
  const category = product.categories;
  if (Array.isArray(category)) {
    return category[0]?.name ?? "HARDWARE";
  }
  return category?.name ?? "HARDWARE";
}

function ProductImage({ product, className }: { product: Product; className: string; }) {
  if (product.signedImage) {
    return <img className={className} src={product.signedImage} alt={product.name} loading="lazy" />;
  }
  return (
    <div className={`${className} product-placeholder`} aria-label={`Imagem indisponível para ${product.name}`}>
      <PackageOpen size={38} color="#52525b" />
    </div>
  );
}

/* CARROSSEL NOVO COM DESIGN UNIFICADO E SEM BURACOS */
function ProductMarquee({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  
  // Repetimos o grupo 4 vezes para garantir que preenche ecrãs ultra-wide mesmo com poucos produtos
  const groups = [0, 1, 2, 3]; 

  return (
    <section className="marquee-section" aria-label="Vitrine de produtos">
      <div className="section-header" style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 24px', marginBottom: '24px' }}>
        <h2><Zap size={24} color="var(--brand-primary)" /> OFERTAS RELÂMPAGO</h2>
      </div>

      <div className="marquee-viewport">
        <div className="marquee-track">
          {groups.map((group) => (
            <div className="marquee-group" key={group} aria-hidden={group > 0}>
              {products.map((product) => {
                const hasDiscount = Number(product.compare_at_price) > Number(product.price);
                const priceNumber = Number(product.price);
                const installments = priceNumber > 100 ? 10 : 1;
                const installmentValue = (priceNumber / installments).toFixed(2);

                return (
                  <article className="product-card-pro marquee-pro-card" key={`${group}-${product.id}`}>
                    {hasDiscount && <span className="discount-tag">OFERTA</span>}

                    <Link href={`/produto/${product.slug}`} className="pro-img-wrapper">
                      <ProductImage product={product} className="" />
                    </Link>

                    <span className="pro-cat">{getCategoryName(product)}</span>
                    
                    <Link href={`/produto/${product.slug}`} style={{ textDecoration: 'none' }}>
                      <h3 className="pro-title" title={product.name}>{product.name}</h3>
                    </Link>

                    <div className="pro-price-block">
                      {hasDiscount ? (
                        <span className="price-old">{formatPrice(product.compare_at_price)}</span>
                      ) : (
                        <span className="price-old" style={{ visibility: 'hidden' }}>-</span>
                      )}
                      
                      <div className="price-pix">
                        {formatPrice(product.price)} <small>no PIX</small>
                      </div>
                      
                      {installments > 1 && (
                        <div className="price-card">
                          ou {installments}x de R$ {installmentValue}
                        </div>
                      )}
                    </div>

                    <div className="add-to-cart-wrapper" style={{ marginTop: '16px' }}>
                      <AddToCartButton
                        stock={product.stock}
                        product={{
                          id: product.id,
                          name: product.name,
                          price: Number(product.price),
                          image_url: product.signedImage ?? null,
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const supabase = await createClient();

  const [
    { data: categoryData, error: categoryError },
    { data: productData, error: productError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("products")
      .select(
        "id, name, slug, description, price, compare_at_price, image_url, stock, is_featured, sort_order, categories(name)"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  if (categoryError) console.error("Erro categorias:", categoryError.message);
  if (productError) console.error("Erro produtos:", productError.message);

  const categories = (categoryData ?? []) as Category[];
  let products = (productData ?? []) as Product[];

  products = await Promise.all(
    products.map(async (product) => {
      if (!product.image_url) return { ...product, signedImage: null };
      const { data, error } = await supabase.storage
        .from("product-images")
        .createSignedUrl(product.image_url, 60 * 60);
      
      if (error) return { ...product, signedImage: null };
      return { ...product, signedImage: data.signedUrl };
    })
  );

  const featuredProducts = products.filter((product) => product.is_featured);
  const marqueeProducts = featuredProducts.length ? featuredProducts : products;

  return (
    <main className="ecommerce-pro">
      
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-base: #09090b;       
          --bg-card: #131316;       
          --bg-header: #18181b;     
          --border-color: #27272a;  
          --brand-primary: #8b5cf6; 
          --brand-primary-hover: #7c3aed;
          --brand-accent: #22d3ee;  
          --text-main: #f4f4f5;
          --text-muted: #a1a1aa;
        }
        
        body { background-color: var(--bg-base) !important; color: var(--text-main) !important; font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
        
        .top-bar { background: var(--brand-primary); color: #fff; font-size: 0.75rem; font-weight: 700; text-align: center; padding: 6px; letter-spacing: 1px; text-transform: uppercase; }
        .header-solid { background: var(--bg-header); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; padding: 16px 0; }
        .header-container { max-width: 1300px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }
        .brand-logo { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 1.5rem; text-transform: uppercase; letter-spacing: -0.5px; }
        .brand-logo svg { color: var(--brand-primary); }
        .search-bar { flex: 1; max-width: 500px; position: relative; }
        .search-bar input { width: 100%; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; padding-right: 48px; color: #fff; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .search-bar input:focus { border-color: var(--brand-primary); }
        .search-bar button { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); background: none; border: none; cursor: pointer; }
        .header-actions-group { display: flex; align-items: center; gap: 20px; }
        .header-link { color: var(--text-muted); font-size: 0.9rem; font-weight: 600; transition: color 0.2s; display: none; }
        @media(min-width: 1024px) { .header-link { display: block; } }
        .header-link:hover { color: #fff; }

        .nav-categories { background: #131316; border-bottom: 1px solid var(--border-color); padding: 12px 0; }
        .nav-categories-inner { max-width: 1300px; margin: 0 auto; padding: 0 24px; display: flex; gap: 24px; overflow-x: auto; scrollbar-width: none; }
        .nav-categories-inner::-webkit-scrollbar { display: none; }
        .nav-cat-item { color: var(--text-main); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; display: flex; align-items: center; gap: 6px; transition: color 0.2s; }
        .nav-cat-item:hover { color: var(--brand-primary); }

        .benefits-bar { background: var(--bg-header); padding: 24px 0; margin-top: 24px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
        .benefits-inner { max-width: 1300px; margin: 0 auto; padding: 0 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }
        .benefit-item { display: flex; align-items: center; gap: 16px; }
        .benefit-icon { background: rgba(139, 92, 246, 0.1); color: var(--brand-primary); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .benefit-text b { display: block; font-size: 0.95rem; color: #fff; }
        .benefit-text small { color: var(--text-muted); font-size: 0.8rem; }

        .store-section { max-width: 1300px; margin: 48px auto; padding: 0 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--border-color); padding-bottom: 16px; margin-bottom: 32px; }
        .section-header h2 { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; margin: 0; display: flex; align-items: center; gap: 12px; }
        .section-header h2::before { content: ''; display: block; width: 6px; height: 24px; background: var(--brand-primary); border-radius: 4px; }
        .section-header a { color: var(--brand-primary); font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 4px; }

        /* CARTÕES PRO E GRID */
        .ecommerce-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .product-card-pro { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; position: relative; transition: all 0.2s; }
        .product-card-pro:hover { border-color: var(--brand-primary); box-shadow: 0 8px 25px rgba(0,0,0,0.5); transform: translateY(-4px); }
        .discount-tag { position: absolute; top: 16px; left: 16px; background: #ef4444; color: #fff; font-size: 0.75rem; font-weight: 900; padding: 4px 8px; border-radius: 4px; z-index: 2; }
        
        .pro-img-wrapper { width: 100%; aspect-ratio: 1; background: #1a1a1f; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .pro-img-wrapper img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: lighten; transition: transform 0.3s; }
        .product-card-pro:hover .pro-img-wrapper img { transform: scale(1.05); }
        
        .pro-cat { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
        .pro-title { font-size: 0.95rem; color: #fff; font-weight: 600; line-height: 1.4; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em; }
        
        .pro-price-block { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 2px; }
        .price-old { color: #71717a; font-size: 0.8rem; text-decoration: line-through; }
        .price-pix { color: var(--brand-accent); font-size: 1.5rem; font-weight: 900; display: flex; align-items: baseline; gap: 4px; }
        .price-pix small { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
        .price-card { color: var(--text-main); font-size: 0.85rem; margin-top: 4px; font-weight: 500; }
        
        .product-card-pro .add-to-cart-wrapper form button { width: 100%; background: var(--brand-primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
        .product-card-pro .add-to-cart-wrapper form button:hover { background: var(--brand-primary-hover); }
        .product-card-pro .add-to-cart-wrapper form button:disabled { background: #3f3f46; color: #a1a1aa; cursor: not-allowed; }

        /* CARROSSEL NOVO */
        .marquee-section { padding: 48px 0; background: var(--bg-base); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); overflow: hidden; margin: 48px 0; position: relative; }
        .marquee-viewport { position: relative; width: 100vw; display: flex; overflow: hidden; margin-left: calc(-50vw + 50%); padding: 10px 0; }
        .marquee-track { display: flex; width: max-content; animation: scrollMarquee 45s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes scrollMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-group { display: flex; gap: 20px; padding: 0 10px; }
        .marquee-pro-card { width: 280px; flex-shrink: 0; }

        /* CATEGORIAS */
        .cat-block-link { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-decoration: none; transition: all 0.2s; }
        .cat-block-link:hover { border-color: var(--brand-primary); transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
      `}} />

      <div className="top-bar">
        OFERTAS EXPLOSIVAS • DESCONTOS NO PIX • ENTREGA RÁPIDA
      </div>

      <header className="header-solid">
        <div className="header-container">
          <Link href="/" className="brand-logo" aria-label="Mega Imports">
            <Zap size={28} /> MEGA IMPORTS
          </Link>

          <div className="search-bar">
            <input type="text" placeholder="Procure por placa de vídeo, processador, periféricos..." />
            <button aria-label="Pesquisar"><Search size={20} /></button>
          </div>

          <div className="header-actions-group">
            <a href="#" className="header-link">Minha Conta</a>
            <a href="#" className="header-link">Meus Pedidos</a>
            <CartHeaderButton /> 
          </div>
        </div>
      </header>

      <nav className="nav-categories">
        <div className="nav-categories-inner">
          <Link href="#categorias" className="nav-cat-item"><Menu size={16} /> DEPARTAMENTOS</Link>
          <span style={{ color: '#3f3f46' }}>|</span>
          <Link href="#destaques" className="nav-cat-item">PC GAMER</Link>
          <Link href="#destaques" className="nav-cat-item">HARDWARE</Link>
          <Link href="#destaques" className="nav-cat-item">PERIFÉRICOS</Link>
          <Link href="#destaques" className="nav-cat-item">MONITORES</Link>
          <Link href="#destaques" className="nav-cat-item" style={{ color: '#ef4444' }}>% OFERTAS</Link>
        </div>
      </nav>

      <div style={{ marginTop: '24px' }}>
        <PromoBanner />
      </div>

      <section className="benefits-bar">
        <div className="benefits-inner">
          <div className="benefit-item">
            <div className="benefit-icon"><Truck size={24} /></div>
            <div className="benefit-text"><b>ENTREGA PARA TODO O BRASIL</b><small>Diversas opções de frete</small></div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon"><Zap size={24} /></div>
            <div className="benefit-text"><b>DESCONTO NO PIX</b><small>Até 15% OFF à vista</small></div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon"><ShieldCheck size={24} /></div>
            <div className="benefit-text"><b>COMPRA 100% SEGURA</b><small>Dados criptografados</small></div>
          </div>
        </div>
      </section>

      {/* CARROSSEL INTEGRADO NA LOJA */}
      <ProductMarquee products={marqueeProducts} />

      <section className="store-section" id="destaques">
        <div className="section-header">
          <h2>HARDWARE EM DESTAQUE</h2>
          <Link href="#categorias">VER TODOS <ArrowRight size={16} /></Link>
        </div>

        {products.length > 0 ? (
          <div className="ecommerce-grid">
            {products.map((product) => {
              const hasDiscount = Number(product.compare_at_price) > Number(product.price);
              
              const priceNumber = Number(product.price);
              const installments = priceNumber > 100 ? 10 : 1;
              const installmentValue = (priceNumber / installments).toFixed(2);

              return (
                <article className="product-card-pro" key={product.id}>
                  
                  {hasDiscount && <span className="discount-tag">OFERTA</span>}

                  <Link href={`/produto/${product.slug}`} className="pro-img-wrapper">
                    <ProductImage product={product} className="" />
                  </Link>

                  <span className="pro-cat">{getCategoryName(product)}</span>
                  
                  <Link href={`/produto/${product.slug}`} style={{ textDecoration: 'none' }}>
                    <h3 className="pro-title" title={product.name}>{product.name}</h3>
                  </Link>

                  <div className="pro-price-block">
                    {hasDiscount ? (
                      <span className="price-old">{formatPrice(product.compare_at_price)}</span>
                    ) : (
                      <span className="price-old" style={{ visibility: 'hidden' }}>-</span>
                    )}
                    
                    <div className="price-pix">
                      {formatPrice(product.price)} <small>à vista no PIX</small>
                    </div>
                    
                    {installments > 1 && (
                      <div className="price-card">
                        ou {installments}x de R$ {installmentValue} sem juros
                      </div>
                    )}
                  </div>

                  <div className="add-to-cart-wrapper" style={{ marginTop: '16px' }}>
                    <AddToCartButton
                      stock={product.stock}
                      product={{
                        id: product.id,
                        name: product.name,
                        price: Number(product.price),
                        image_url: product.signedImage ?? null,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '60px', textAlign: 'center' }}>
            <PackageOpen size={48} color="var(--brand-primary)" style={{ margin: '0 auto 20px auto' }} />
            <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '10px' }}>Catálogo em preparação</h3>
            <p style={{ color: 'var(--text-muted)' }}>Os produtos cadastrados no painel irão aparecer aqui no formato de grade.</p>
          </div>
        )}
      </section>

      <section className="store-section" id="categorias" style={{ marginTop: '60px' }}>
        <div className="section-header">
          <h2>NAVEGUE POR DEPARTAMENTOS</h2>
        </div>

        {categories.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {categories.map((category, index) => {
              const Icon = categoryIcons[index % categoryIcons.length];
              return (
                <Link
                  href="#destaques"
                  key={category.id}
                  className="cat-block-link"
                >
                  <Icon size={40} color="var(--brand-primary)" />
                  <div style={{ textAlign: 'center' }}>
                    <b style={{ color: '#fff', display: 'block', fontSize: '1rem', textTransform: 'uppercase' }}>{category.name}</b>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ver produtos</small>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      <footer style={{ background: 'var(--bg-header)', borderTop: '1px solid var(--border-color)', marginTop: '80px', padding: '48px 24px' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '32px' }}>
          <div>
            <div className="brand-logo" style={{ marginBottom: '16px' }}><Zap size={24} /> MEGA IMPORTS</div>
            <p style={{ color: 'var(--text-muted)', maxWidth: '300px', fontSize: '0.9rem' }}>A loja definitiva para o seu hardware de alta performance. Qualidade, garantia e entrega rápida.</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: '800' }}>Departamentos</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><Link href="#destaques" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Hardware</Link></li>
              <li><Link href="#destaques" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Periféricos</Link></li>
              <li><Link href="#destaques" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Monitores</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: '800' }}>Atendimento</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><Link href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Meus Pedidos</Link></li>
              <li><Link href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Políticas de Troca</Link></li>
              <li><Link href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Fale Conosco</Link></li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: '1300px', margin: '48px auto 0 auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <span>© {new Date().getFullYear()} MEGA IMPORTS. Todos os direitos reservados.</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></div> Sistema Online</span>
        </div>
      </footer>
    </main>
  );
}