import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { asaasRequest } from "@/lib/asaas/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items, paymentMethod, creditCard, installmentCount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "O carrinho está vazio." }, { status: 400 });
    }

    const cleanCpfCnpj = (customer?.cpfCnpj || "").replace(/\D/g, "");
    const cleanPhone = (customer?.phone || "").replace(/\D/g, "");
    const cleanCep = (customer?.cep || "").replace(/\D/g, "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Erro de configuração do servidor Supabase." }, { status: 500 });
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

    // Criar o pedido PENDENTE no Supabase primeiro
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
    // DIVISÃO DE PAGAMENTO: ASAAS (CARTÃO) VS MANUAL (PIX)
    // ==========================================
    if (paymentMethod === "CREDIT_CARD") {
      // 1. Criar/Atualizar cliente no Asaas
      const asaasCustomer = await asaasRequest<{ id: string }>("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: customer.name.trim(),
          email: customer.email.trim(),
          cpfCnpj: cleanCpfCnpj,
          mobilePhone: cleanPhone,
          postalCode: cleanCep,
          address: customer.address?.trim() || "Não informado",
          addressNumber: customer.number?.trim() || "S/N",
          province: customer.neighborhood?.trim() || "Geral",
        }),
      });

      await supabase.from("orders").update({ asaas_customer_id: asaasCustomer.id }).eq("id", createdOrder.id);

      const dueDate = new Date().toISOString().split("T")[0];
      const installments = Number(installmentCount) || 1;

      const paymentPayload: any = {
        customer: asaasCustomer.id,
        billingType: "CREDIT_CARD",
        dueDate,
        description: `Pedido Mega Imports #${createdOrder.id.slice(0, 8)}`,
        externalReference: createdOrder.id,
        creditCard: {
          holderName: creditCard.holderName,
          number: creditCard.number.replace(/\D/g, ""),
          expiryMonth: creditCard.expiryMonth,
          expiryYear: creditCard.expiryYear,
          ccv: creditCard.ccv
        },
        creditCardHolderInfo: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          cpfCnpj: cleanCpfCnpj,
          postalCode: cleanCep,
          addressNumber: customer.number?.trim() || "S/N",
          addressComplement: null,
          phone: cleanPhone,
          mobilePhone: cleanPhone
        }
      };

      let asaasPayment;

      // Processar parcelamento no Asaas se for > 1
      if (installments > 1) {
        paymentPayload.totalValue = serverTotal;
        paymentPayload.installmentCount = installments;
        asaasPayment = await asaasRequest<any>("/installments", {
          method: "POST",
          body: JSON.stringify(paymentPayload),
        });
      } else {
        paymentPayload.value = serverTotal;
        asaasPayment = await asaasRequest<any>("/payments", {
          method: "POST",
          body: JSON.stringify(paymentPayload),
        });
      }

      // Atualizar o ID do pagamento no Supabase
      await supabase.from("orders").update({ asaas_payment_id: asaasPayment.id }).eq("id", createdOrder.id);

      return NextResponse.json({
        orderId: createdOrder.id,
        paymentId: asaasPayment.id,
        total: serverTotal,
        status: asaasPayment.status || "CONFIRMED", 
        method: "CREDIT_CARD",
        installments
      });

    } else {
      // É PIX MANUAL, ignoramos o Asaas e retornamos sucesso direto
      return NextResponse.json({
        orderId: createdOrder.id,
        total: serverTotal,
        method: "PIX",
        success: true
      });
    }
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    console.error("ERRO:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}