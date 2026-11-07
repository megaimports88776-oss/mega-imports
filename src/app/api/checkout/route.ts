import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // cardToken será enviado pelo frontend quando implementarmos o cartão via SDK
    const { customer, items, paymentMethod, cardToken, installmentCount, issuerId } = body;

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

    // Validar produtos
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

    // Criar o pedido PENDENTE no Supabase
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
    // INTEGRAÇÃO MERCADO PAGO API (V1)
    // ==========================================
    
    const mpPayload: any = {
      transaction_amount: serverTotal,
      description: `Mega Imports - Pedido #${createdOrder.id.slice(0, 8)}`,
      external_reference: createdOrder.id,
      payer: {
        email: customer.email.trim(),
        first_name: customer.name.trim().split(" ")[0],
        last_name: customer.name.trim().split(" ").slice(1).join(" "),
        identification: {
          type: cleanCpfCnpj.length > 11 ? "CNPJ" : "CPF",
          number: cleanCpfCnpj
        }
      }
    };

    if (paymentMethod === "PIX") {
      mpPayload.payment_method_id = "pix";
    } else if (paymentMethod === "CREDIT_CARD") {
      if (!cardToken) {
        return NextResponse.json({ error: "Token do cartão não fornecido pelo frontend." }, { status: 400 });
      }
      mpPayload.token = cardToken;
      mpPayload.installments = Number(installmentCount) || 1;
      mpPayload.payment_method_id = "credit_card"; 
      if (issuerId) mpPayload.issuer_id = issuerId;
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": createdOrder.id // Evita pagamentos duplicados
      },
      body: JSON.stringify(mpPayload)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok || mpData.error) {
      console.error("Erro Mercado Pago:", mpData);
      return NextResponse.json({ error: `Erro no pagamento: ${mpData.message || 'Falha na transação'}` }, { status: 400 });
    }

    await supabase.from("orders").update({ asaas_payment_id: String(mpData.id) }).eq("id", createdOrder.id);

    if (paymentMethod === "PIX") {
      return NextResponse.json({
        orderId: createdOrder.id,
        paymentId: mpData.id,
        total: serverTotal,
        qrCodeBase64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: mpData.point_of_interaction?.transaction_data?.qr_code,
        method: "PIX",
        status: mpData.status
      });
    } else {
      return NextResponse.json({
        orderId: createdOrder.id,
        paymentId: mpData.id,
        total: serverTotal,
        status: mpData.status,
        method: "CREDIT_CARD",
        installments: mpPayload.installments
      });
    }
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    console.error("ERRO:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}