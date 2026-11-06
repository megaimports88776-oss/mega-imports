import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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
        .promo-banner-wrapper { 
          width: 100%; 
          max-width: 1250px; 
          margin: 1.5rem auto 0 auto; 
          padding: 0 24px; 
          box-sizing: border-box; 
        }
        .promo-banner { 
          display: block; 
          width: 100%;
          border-radius: 16px; 
          overflow: hidden; 
          text-decoration: none; 
          border: 1px solid rgba(255, 255, 255, 0.08); 
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transition: border-color 0.3s ease;
        }
        .promo-banner:hover { 
          border-color: rgba(139, 92, 246, 0.5); 
        }
        .promo-img {
          width: 100%;
          height: auto;
          display: block;
          aspect-ratio: 21/7; /* Ajuste se o banner ficar muito esticado ou achatado */
          object-fit: cover;
          object-position: center;
        }
        @media (max-width: 768px) {
          .promo-img { aspect-ratio: 16/9; }
        }
      `}} />

      <Link href={banner.link_url || "#"} className="promo-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={banner.image_url} 
          alt="Oferta Especial" 
          className="promo-img"
        />
      </Link>
    </section>
  );
}