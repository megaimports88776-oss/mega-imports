"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, LogOut, ShieldCheck, ArrowLeft,
  Image as ImageIcon, Upload, Link as LinkIcon, Type, AlignLeft, CheckCircle2, AlertCircle, Trash2
} from "lucide-react";

export default function AdminBannerPage() {
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBannerId, setActiveBannerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [userEmail, setUserEmail] = useState("A carregar...");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });

    async function fetchActiveBanner() {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveBannerId(data.id);
        setTitle(data.title);
        setSubtitle(data.subtitle || "");
        setLinkUrl(data.link_url || "");
        setCurrentImageUrl(data.image_url);
      }
    }
    fetchActiveBanner();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const handleDelete = async () => {
    if (!activeBannerId) return;
    const confirmar = window.confirm("Tem a certeza que deseja remover o banner da loja?");
    if (!confirmar) return;

    setDeleting(true);
    try {
      await supabase.from("promotional_banners").update({ is_active: false }).eq("id", activeBannerId);
      setMessage({ text: "Banner removido da loja com sucesso!", type: "success" });
      setActiveBannerId(null);
      setTitle(""); setSubtitle(""); setLinkUrl(""); setCurrentImageUrl(null); setImageFile(null);
    } catch (error) {
      setMessage({ text: "Erro ao remover banner.", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageFile && !currentImageUrl) {
      setMessage({ text: "É obrigatório ter uma imagem para o banner.", type: "error" });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      let finalImageUrl = currentImageUrl;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `banner_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("banners").upload(fileName, imageFile);
        if (uploadError) throw new Error("Erro ao fazer upload da imagem");

        const { data: publicUrlData } = supabase.storage.from("banners").getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      await supabase.from("promotional_banners").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");

      const { data: newBanner, error: insertError } = await supabase.from("promotional_banners").insert({
        title, subtitle, link_url: linkUrl, image_url: finalImageUrl, is_active: true
      }).select().single();

      if (insertError) throw new Error(insertError.message);

      setActiveBannerId(newBanner.id);
      setCurrentImageUrl(finalImageUrl);
      setImageFile(null);
      setMessage({ text: "Banner guardado e publicado com sucesso!", type: "success" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido";
      setMessage({ text: `Erro: ${errorMessage}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-dashboard-brand">MEGA <span>IMPORTS</span></Link>
        <div className="admin-sidebar-label">GERENCIAMENTO</div>
        <Link href="/admin" className="admin-nav-item"><LayoutDashboard size={19} /> Visão geral</Link>
        <Link href="/admin/produtos" className="admin-nav-item"><Package size={19} /> Produtos</Link>
        <Link href="/admin/categorias" className="admin-nav-item"><ShoppingBag size={19} /> Categorias</Link>
        <Link href="/admin/banner" className="admin-nav-item admin-nav-active"><ImageIcon size={19} /> Banners</Link>
        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <div className="admin-user-avatar"><ShieldCheck size={20} /></div>
            <div className="admin-user-details"><strong>Administrador</strong><span>{userEmail}</span></div>
          </div>
          <button className="admin-logout-button" onClick={handleLogout} style={{ width: '100%', cursor: 'pointer' }}><LogOut size={17} /> Sair do painel</button>
          <Link href="/" className="admin-store-link"><ArrowLeft size={16} /> Voltar para a loja</Link>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-breadcrumb">MEGA IMPORTS / ADMINISTRAÇÃO</p><h1>Banners</h1></div>
          <span className="admin-status"><span className="admin-status-dot" /> Área administrativa</span>
        </header>

        <div className="admin-content-card" style={{ marginTop: '24px', position: 'relative' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            .custom-banner-form { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
            .form-col { display: flex; flex-direction: column; gap: 24px; }
            .form-group { display: flex; flex-direction: column; gap: 10px; }
            .form-label { font-size: 13px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
            .form-label span { color: #8b5cf6; }
            .input-wrapper { position: relative; display: flex; align-items: center; }
            .input-icon { position: absolute; left: 16px; color: #71717a; }
            .custom-input { width: 100%; background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 14px 16px 14px 48px; color: #fff; font-size: 14px; outline: none; transition: all 0.2s ease; }
            .custom-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
            .dropzone { position: relative; height: 100%; min-height: 250px; background: #09090b; border: 2px dashed #27272a; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; overflow: hidden; }
            .dropzone:hover { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.03); }
            .dropzone-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; }
            .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px; text-align: center; z-index: 2; }
            .dropzone-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.4; z-index: 1; filter: blur(2px); transition: opacity 0.3s; }
            .dropzone:hover .dropzone-bg { opacity: 0.2; }
            .dropzone-icon-bg { width: 60px; height: 60px; background: rgba(255, 255, 255, 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; backdrop-filter: blur(4px); transition: all 0.2s; }
            .dropzone-title { color: #fff; font-weight: 600; font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
            .btn-submit { background: #8b5cf6; color: #fff; border: none; border-radius: 12px; padding: 16px 24px; font-size: 15px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s ease; flex: 1; }
            .btn-submit:hover:not(:disabled) { background: #7c3aed; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3); transform: translateY(-2px); }
            .btn-delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 16px 24px; font-size: 15px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s ease; }
            .btn-delete:hover:not(:disabled) { background: #ef4444; color: #fff; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3); transform: translateY(-2px); }
            .btn-submit:disabled, .btn-delete:disabled { opacity: 0.6; cursor: not-allowed; }
            .alert-box { padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; font-size: 14px; font-weight: 500; }
            .alert-success { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; }
            .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; }
            @media (max-width: 1024px) { .custom-banner-form { grid-template-columns: 1fr; gap: 24px; } }
          `}} />

          <div style={{ paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '0 0 8px 0' }}>{activeBannerId ? "Editar Banner Atual" : "Criar Novo Banner"}</h2>
              <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>Gerencie o destaque principal da loja.</p>
            </div>
            {activeBannerId && (
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(16,185,129,0.3)' }}>
                Banner Ativo na Loja
              </span>
            )}
          </div>

          {message && (
            <div className={`alert-box ${message.type === "success" ? "alert-success" : "alert-error"}`}>
              {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="custom-banner-form">
            <div className="form-col">
              <div className="form-group"><label className="form-label">Título em Destaque</label><div className="input-wrapper"><Type size={18} className="input-icon" /><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Deixe em branco para usar só a imagem" className="custom-input" /></div></div>
              <div className="form-group"><label className="form-label">Subtítulo (Descrição)</label><div className="input-wrapper"><AlignLeft size={18} className="input-icon" /><input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Opcional" className="custom-input" /></div></div>
              <div className="form-group"><label className="form-label">Link de destino (Opcional)</label><div className="input-wrapper"><LinkIcon size={18} className="input-icon" /><input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Ex: /categoria/perifericos" className="custom-input" /></div></div>
            </div>

            <div className="form-col" style={{ height: '100%' }}>
              <div className="form-group" style={{ height: '100%' }}>
                <label className="form-label">Imagem de Fundo (1200x400) <span>*</span></label>
                <div className="dropzone">
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="dropzone-input" />
                  {(currentImageUrl && !imageFile) && <div className="dropzone-bg" style={{ backgroundImage: `url(${currentImageUrl})` }} />}
                  <div className="dropzone-content">
                    <div className="dropzone-icon-bg"><ImageIcon size={28} /></div>
                    <span className="dropzone-title">
                      {imageFile ? imageFile.name : currentImageUrl ? "Imagem atual carregada. Clique para trocar." : "Clique para escolher a imagem"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', marginTop: '10px' }}>
              {activeBannerId && (
                <button type="button" onClick={handleDelete} disabled={deleting || loading} className="btn-delete">
                  <Trash2 size={20} /> {deleting ? "A remover..." : "Remover Banner"}
                </button>
              )}
              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? "A guardar..." : activeBannerId ? "Atualizar Banner" : "Publicar Novo Banner"}
                {!loading && <Upload size={20} />}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}