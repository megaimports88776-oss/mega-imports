import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "O carrinho está vazio." }, { status: 400 });
    }

    const cleanCpfCnpj = (customer?.cpfCnpj || "").replace(/\D/g, "");
    const cleanPhone = (customer?.phone || "").replace(/\D/g, "");
    const cleanCep = (customer?.cep || "").replace(/\D/g, "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseServiceKey || !mpAccessToken) {
      return NextResponse.json({ error: "Erro de configuração de chaves (Supabase ou Mercado Pago)." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const productIds = items.map((i: { id: string }) => i.id);
    const { data: dbProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock, is_active")
      .in("id", productIds);

    if (productsError || !dbProducts) {
      return NextResponse.json({ error: "Erro ao consultar produtos." }, { status: 500 });
    }

    let serverTotal = 0;
    const validatedItems = [];

    for (const cartItem of items) {
      const dbProduct = dbProducts.find((p) => p.id === cartItem.id);
      if (!dbProduct || !dbProduct.is_active) {
        return NextResponse.json({ error: "Produto indisponível." }, { status: 400 });
      }

      const qty = Math.max(1, Math.floor(Number(cartItem.quantity)));
      const unitPrice = Number(dbProduct.price);
      const subtotal = Number((unitPrice * qty).toFixed(2));
      serverTotal = Number((serverTotal + subtotal).toFixed(2));

      validatedItems.push({
        product_id: dbProduct.id,
        product_name: dbProduct.name,
        unit_price: unitPrice,
        quantity: qty,
        subtotal,
      });
    }

    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_cpf_cnpj: cleanCpfCnpj,
        customer_phone: cleanPhone,
        shipping_cep: cleanCep,
        shipping_address: customer.address?.trim() || "",
        shipping_number: customer.number?.trim() || "",
        shipping_neighborhood: customer.neighborhood?.trim() || "",
        shipping_city: customer.city?.trim() || "",
        shipping_state: customer.state?.trim() || "",
        total_amount: serverTotal,
        status: "PENDING"
      })
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      return NextResponse.json({ error: "Erro ao salvar pedido." }, { status: 500 });
    }

    await supabase.from("order_items").insert(
      validatedItems.map((item) => ({ ...item, order_id: createdOrder.id }))
    );

    // ==========================================
    // INTEGRAÇÃO MERCADO PAGO - CHECKOUT PRO
    // ==========================================
    const origin = request.headers.get("origin") || "https://sua-loja-aqui.com";

    const preferencePayload = {
      items: [
        {
          id: createdOrder.id,
          title: `Mega Imports - Pedido #${createdOrder.id.slice(0, 8)}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: serverTotal
        }
      ],
      payer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        identification: {
          type: cleanCpfCnpj.length > 11 ? "CNPJ" : "CPF",
          number: cleanCpfCnpj
        }
      },
      external_reference: createdOrder.id,
      back_urls: {
        success: `${origin}/`,
        failure: `${origin}/checkout`,
        pending: `${origin}/`
      },
      auto_return: "approved"
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro MP Preferences:", mpData);
      return NextResponse.json({ error: "Erro ao gerar link de pagamento do Mercado Pago." }, { status: 400 });
    }

    // Retorna o link de redirecionamento para o frontend
    return NextResponse.json({ initPoint: mpData.init_point });
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    console.error("ERRO:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}