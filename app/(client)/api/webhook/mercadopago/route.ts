
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { backendClient } from "@/sanity/lib/backendClient";

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const payment = new Payment(client);

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Webhook do Mercado Pago recebido");

    const body = await req.json();
    console.log("📋 Dados do webhook:", JSON.stringify(body, null, 2));

    // Validar tipo de notificação
    if (body.type !== "payment") {
      console.log("ℹ️ Notificação ignorada, tipo:", body.type);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Obter ID do pagamento
    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error("❌ ID do pagamento não encontrado");
      return NextResponse.json({ error: "Payment ID missing" }, { status: 400 });
    }

    console.log("💳 Processando pagamento ID:", paymentId);

    // Buscar detalhes do pagamento no Mercado Pago
    const paymentData = await payment.get({ id: paymentId });
    console.log("📊 Dados do pagamento:", {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference,
      transaction_amount: paymentData.transaction_amount
    });

    // Verificar se o pagamento foi aprovado
    if (paymentData.status === "approved") {
      console.log("✅ Pagamento aprovado!");

      // Criar pedido no Sanity
      const orderData = {
        _type: "order",
        orderNumber: paymentData.external_reference,
        mercadoPagoPaymentId: paymentData.id?.toString(),
        customerName: paymentData.metadata?.customer_name || paymentData.additional_info?.payer?.first_name || "Cliente",
        email: paymentData.metadata?.customer_email || paymentData.payer?.email || "",
        customerPhone: paymentData.metadata?.customer_phone || "",
        customerAddress: paymentData.metadata?.customer_address ? JSON.parse(paymentData.metadata.customer_address) : null,
        clerkUserId: paymentData.metadata?.clerk_user_id || "",
        currency: paymentData.currency_id || "BRL",
        totalPrice: paymentData.transaction_amount || 0,
        status: "paid",
        orderDate: new Date().toISOString(),
        paymentMethod: "pix",
        mercadoPagoData: {
          payment_id: paymentData.id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          payment_type_id: paymentData.payment_type_id,
          date_approved: paymentData.date_approved,
          transaction_amount: paymentData.transaction_amount,
        }
      };

      // Salvar no Sanity
      const createdOrder = await backendClient.create(orderData);
      console.log("💾 Pedido criado no Sanity:", createdOrder._id);

    } else {
      console.log("⏳ Status do pagamento:", paymentData.status);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: "Webhook do Mercado Pago funcionando!",
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
