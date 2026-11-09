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
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseServiceKey || !mpToken) {
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
    // INTEGRAÇÃO MERCADO PAGO (Checkout Pro)
    // ==========================================
    
    // Separa o nome para enviar corretamente ao Mercado Pago
    const nomePartes = customer.name.trim().split(" ");
    const primeiroNome = nomePartes[0];
    const sobrenome = nomePartes.slice(1).join(" ") || "Cliente";

    const mpPayload = {
      items: validatedItems.map(item => ({
        id: item.product_id,
        title: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "BRL"
      })),
      payer: {
        name: primeiroNome,
        surname: sobrenome,
        email: customer.email.trim(),
        identification: {
          type: cleanCpfCnpj.length > 11 ? "CNPJ" : "CPF",
          number: cleanCpfCnpj
        },
        phone: {
          area_code: cleanPhone.substring(0, 2),
          number: cleanPhone.substring(2)
        }
      },
      external_reference: createdOrder.id, // Liga o pagamento do MP ao ID do Supabase
      back_urls: {
        success: `${request.headers.get("origin") || "https://sua-loja.com"}/sucesso`,
        failure: `${request.headers.get("origin") || "https://sua-loja.com"}/carrinho`,
        pending: `${request.headers.get("origin") || "https://sua-loja.com"}/pendente`
      },
      auto_return: "approved"
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mpPayload)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro do Mercado Pago:", mpData);
      return NextResponse.json({ error: "Erro ao gerar pagamento no Mercado Pago." }, { status: 400 });
    }

    // O Mercado Pago devolve a URL pronta em 'init_point'
    const initPoint = mpData.init_point;

    if (!initPoint) {
      return NextResponse.json({ error: "URL de pagamento não retornada pelo Mercado Pago." }, { status: 500 });
    }

    return NextResponse.json({ initPoint });
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    console.error("ERRO:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}