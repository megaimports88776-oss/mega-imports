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
    const clientId = process.env.CAKTO_CLIENT_ID;
    const clientSecret = process.env.CAKTO_CLIENT_SECRET;

    if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Erro de configuração de chaves (Supabase ou Cakto)." }, { status: 500 });
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

    // ==========================================
    // INTEGRAÇÃO CAKTO PAY
    // ==========================================
    
    // 1. Gerar Token (Com cabeçalhos de segurança para evitar Firewall)
    const tokenResponse = await fetch("https://api.cakto.com.br/public_api/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        "client_id": clientId,
        "client_secret": clientSecret
      }).toString()
    });

    const tokenText = await tokenResponse.text();
    let tokenData;
    
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error("ERRO HTML NO TOKEN DA CAKTO:", tokenText);
      return NextResponse.json({ error: "O servidor da Cakto bloqueou o acesso ao Token (Verifique os logs na Vercel)." }, { status: 500 });
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Erro Auth Cakto:", tokenData);
      return NextResponse.json({ error: "Falha ao autenticar na Cakto. Verifique se as credenciais estão corretas." }, { status: 500 });
    }

    const accessToken = tokenData.access_token;
    const origin = request.headers.get("origin") || "https://sua-loja.com";

    // 2. Gerar Link de Pagamento
    const caktoPayload = {
      amount: Math.round(serverTotal * 100),
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        document: cleanCpfCnpj,
        phone: cleanPhone
      },
      items: validatedItems.map((item) => ({
        title: item.product_name,
        quantity: item.quantity,
        unit_price: Math.round(item.unit_price * 100),
        tangible: true
      })),
      metadata: { order_id: createdOrder.id },
      success_url: `${origin}/sucesso`,
      cancel_url: `${origin}/carrinho`
    };

    const caktoResponse = await fetch("https://api.cakto.com.br/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      body: JSON.stringify(caktoPayload)
    });

    const caktoText = await caktoResponse.text();
    let caktoData;

    try {
      caktoData = JSON.parse(caktoText);
    } catch (e) {
      console.error("ERRO HTML NO CHECKOUT DA CAKTO:", caktoText);
      return NextResponse.json({ error: "A Cakto devolveu HTML em vez de criar o pagamento (Verifique os logs)." }, { status: 500 });
    }

    if (!caktoResponse.ok) {
      console.error("Erro Checkout Cakto:", caktoData);
      return NextResponse.json({ error: "Erro ao gerar link de pagamento na Cakto." }, { status: 400 });
    }

    const initPoint = caktoData.checkout_url || caktoData.payment_url || caktoData.url;

    if (!initPoint) {
      return NextResponse.json({ error: "Link não retornado pela Cakto." }, { status: 500 });
    }

    await supabase.from("order_items").insert(
      validatedItems.map((item) => ({ ...item, order_id: createdOrder.id }))
    );

    return NextResponse.json({ initPoint });
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    console.error("ERRO:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}