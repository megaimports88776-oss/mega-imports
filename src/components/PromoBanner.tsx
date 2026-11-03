import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";

export const revalidate = 30; 

export default async function PromoBanner() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: banner } = await supabase
    .from("promotional_banners")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!banner) return null; 

  return (
    <section className="promo-banner-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .promo-banner-wrapper { width: 100%; max-width: 1200px; margin: 2rem auto 0 auto; padding: 0 24px; box-sizing: border-box; }
        .promo-banner { position: relative; display: flex; flex-direction: column; justify-content: center; min-height: 400px; border-radius: 24px; overflow: hidden; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 0 40px rgba(124, 58, 237, 0.1); transition: all 0.4s ease; }
        .promo-banner:hover { transform: translateY(-4px); box-shadow: 0 10px 50px rgba(124, 58, 237, 0.25); border-color: rgba(139, 92, 246, 0.4); }
        .promo-bg { position: absolute; inset: 0; width: 100%; height: 100%; background-size: 100% 100%; background-position: center; background-repeat: no-repeat; transition: transform 0.7s ease; z-index: 1; }
        .promo-banner:hover .promo-bg { transform: scale(1.02); }
        .promo-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.5) 45%, transparent 100%); z-index: 2; }
        .promo-content { position: relative; z-index: 3; padding: 48px; max-width: 600px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
        .promo-badge { display: inline-block; background: rgba(139, 92, 246, 0.2); color: #d8b4fe; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(139, 92, 246, 0.3); backdrop-filter: blur(4px); }
        .promo-title { font-size: 3rem; font-weight: 900; color: #fff; line-height: 1.1; text-transform: uppercase; letter-spacing: -1px; margin: 0; text-shadow: 0 4px 20px rgba(0,0,0,0.8); }
        .promo-subtitle { font-size: 1.125rem; color: #d4d4d8; line-height: 1.5; margin: 0; }
        .promo-action { display: flex; align-items: center; gap: 8px; color: #a78bfa; font-weight: 700; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; margin-top: 8px; transition: color 0.2s; }
        .promo-banner:hover .promo-action { color: #c4b5fd; }
        .promo-icon { transition: transform 0.3s ease; }
        .promo-banner:hover .promo-icon { transform: translateX(6px); }
        @media (max-width: 768px) {
          .promo-banner { min-height: 380px; }
          .promo-bg { background-size: cover; background-position: right center; } 
          .promo-content { padding: 32px 24px; }
          .promo-title { font-size: 2rem; }
          .promo-overlay { background: linear-gradient(to top, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.6) 100%); }
        }
      `}} />

      <Link href={banner.link_url || "#"} className="promo-banner">
        <div className="promo-bg" style={{ backgroundImage: `url('${banner.image_url}')` }} />
        <div className="promo-overlay" />
        <div className="promo-content">
          <span className="promo-badge">Oferta Especial</span>
          <h2 className="promo-title">{banner.title}</h2>
          {banner.subtitle && <p className="promo-subtitle">{banner.subtitle}</p>}
          <div className="promo-action">Aproveitar agora <ArrowRight size={18} className="promo-icon" /></div>
        </div>
      </Link>
    </section>
  );
}