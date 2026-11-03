import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get("asaas-access-token");

  if (!expectedToken || !receivedToken || !safeEqual(receivedToken, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { id?: string; event?: string; payment?: { id?: string; value?: number; status?: string } };
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!payload.id || !payload.event || !payload.payment?.id) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Webhook storage is not configured.");
    return NextResponse.json({ error: "Webhook storage unavailable" }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Persist event ID with a unique constraint. Business processing is intentionally
  // not implemented until the order/payment schema and status-transition rules are applied.
  const { error } = await supabase.from("asaas_webhook_events").insert({
    event_id: payload.id,
    event_type: payload.event,
    payment_id: payload.payment.id,
    payload,
    processed: false
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error("Unable to persist Asaas webhook event:", error.code);
    return NextResponse.json({ error: "Could not persist event" }, { status: 503 });
  }
  return NextResponse.json({ received: true });
}

function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const aa = enc.encode(a), bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}