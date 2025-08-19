import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("🔔 Webhook Mercado Pago recebido:", body);

    // Verificar se é uma notificação de pagamento
    if (body.type === "payment") {
      console.log("💰 Notificação de pagamento:", body.data.id);

      // Aqui você pode fazer a verificação do pagamento no Mercado Pago
      // e atualizar o status do pedido no Sanity

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erro no webhook Mercado Pago:", error);
    return NextResponse.json(
      { error: "Erro processando webhook" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook Mercado Pago funcionando",
    timestamp: new Date().toISOString()
  });
}