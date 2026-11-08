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

    // Separar DDD do Número de Telefone (Exigência do PagBank)
    const phoneArea = cleanPhone.substring(0, 2);
    const phoneNumber = cleanPhone.substring(2);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const pagbankToken = process.env.PAGBANK_TOKEN;

    if (!supabaseUrl || !supabaseServiceKey || !pagbankToken) {
      return NextResponse.json({ error: "Erro de configuração de chaves (Supabase ou PagBank)." }, { status: 500 });
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
    const pagbankItems = [];

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

      // O PagBank exige que o valor seja enviado em CENTAVOS (Inteiro)
      pagbankItems.push({
        name: dbProduct.name,
        quantity: qty,
        unit_amount: Math.round(unitPrice * 100) 
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
    // INTEGRAÇÃO PAGBANK (CHECKOUT V4)
    // ==========================================
    const origin = request.headers.get("origin") || "https://sua-loja.com";

    const pagbankPayload = {
      reference_id: createdOrder.id,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        tax_id: cleanCpfCnpj,
        phones: [
          {
            country: "55",
            area: phoneArea,
            number: phoneNumber,
            type: "MOBILE"
          }
        ]
      },
      items: pagbankItems,
      redirect_url: `${origin}/`,
    };

    const pagbankResponse = await fetch("https://api.pagseguro.com/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pagbankToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pagbankPayload)
    });

    const pagbankData = await pagbankResponse.json();

    if (!pagbankResponse.ok) {
      console.error("Erro PagBank:", pagbankData);
      return NextResponse.json({ error: "Erro ao gerar link de pagamento do PagBank." }, { status: 400 });
    }

    // O PagBank devolve um array de links. Nós queremos o link que redireciona para a tela de pagamento ("PAY")
    const payLinkObj = pagbankData.links?.find((link: any) => link.rel === "PAY");

    if (!payLinkObj || !payLinkObj.href) {
      return NextResponse.json({ error: "Link de pagamento não retornado pelo PagBank." }, { status: 500 });
    }

    // Enviamos como "initPoint" para o frontend não precisar de nenhuma alteração!
    return NextResponse.json({ initPoint: payLinkObj.href });
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    console.error("ERRO:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}