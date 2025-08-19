
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(req: NextRequest) {
  console.log("🔔 Webhook Mercado Pago recebido!");

  try {
    const body = await req.json();
    console.log("📦 Dados do webhook:", JSON.stringify(body, null, 2));

    // Verificar se é uma notificação de pagamento
    if (body.type === "payment") {
      const paymentId = body.data?.id;
      
      if (!paymentId) {
        console.log("❌ ID do pagamento não encontrado");
        return NextResponse.json({ status: "error", message: "Payment ID missing" });
      }

      console.log(`💰 Processando pagamento: ${paymentId}`);

      // Aqui você pode consultar o status do pagamento via API do MP
      // e atualizar o pedido no Sanity conforme necessário
      
      // Por exemplo, se o pagamento foi aprovado:
      if (body.action === "payment.updated") {
        console.log("✅ Pagamento atualizado - processando...");
        
        // Buscar detalhes do pagamento usando a API do Mercado Pago
        // const payment = await getPaymentDetails(paymentId);
        
        // Atualizar status do pedido no Sanity se necessário
        // await updateOrderStatus(payment.external_reference, payment.status);
      }
    }

    return NextResponse.json({ 
      status: "ok", 
      message: "Webhook processed successfully",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Erro processando webhook:", error);
    
    return NextResponse.json(
      { 
        status: "error", 
        message: "Webhook processing failed",
        error: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook Mercado Pago endpoint ativo",
    timestamp: new Date().toISOString()
  });
}
