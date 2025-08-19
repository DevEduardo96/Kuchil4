import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  options: { timeout: 10000 }
});

// Removemos a variável 'preference' que não era usada

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 Iniciando criação de checkout PIX...");
    console.log("🔑 Token presente:", !!process.env.MERCADO_PAGO_ACCESS_TOKEN);
    console.log("🔑 Primeiros caracteres do token:", process.env.MERCADO_PAGO_ACCESS_TOKEN?.substring(0, 20) + "...");

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Token do Mercado Pago não configurado", suggestion: "Verifique as variáveis de ambiente" },
        { status: 500 }
      );
    }

    const body = await req.json();
    console.log("📋 Dados recebidos:", JSON.stringify(body, null, 2));

    const { items, metadata } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items são obrigatórios", suggestion: "Envie uma lista válida de produtos" },
        { status: 400 }
      );
    }

    if (!metadata || !metadata.customerEmail || !metadata.customerName) {
      return NextResponse.json(
        { success: false, error: "Dados do cliente são obrigatórios", suggestion: "Envie email e nome do cliente" },
        { status: 400 }
      );
    }

    // Substituindo 'any' por tipos genéricos
    interface ProductItem {
      product: {
        _id: string;
        name: string;
        price: number | string;
        intro?: string;
        description?: string;
        category?: string;
      };
      quantity?: number;
    }

    const mercadoPagoItems = (items as ProductItem[]).map(({ product, quantity = 1 }) => {
      const unitPrice = Number(product.price);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        throw new Error(`Preço inválido para o produto ${product.name}: ${product.price}`);
      }
      return {
        id: product._id,
        title: product.name || "Produto sem nome",
        description: product.intro || product.description || "Produto da loja",
        quantity,
        unit_price: unitPrice,
        currency_id: "BRL",
        category_id: product.category || "others"
      };
    });

    const totalAmount = mercadoPagoItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    const uniqueReference = `${metadata.orderNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const preferenceData = {
      items: mercadoPagoItems,
      payer: { name: metadata.customerName, email: metadata.customerEmail },
      payment_methods: {
        excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }],
        excluded_payment_methods: [],
        default_payment_method_id: "pix",
        installments: 1
      },
      back_urls: {
        success: `https://seusite.com/success?session_id=${uniqueReference}`,
        failure: `https://seusite.com/cart?error=payment_failed`,
        pending: `https://seusite.com/cart?status=pending`
      },
      auto_return: "approved",
      external_reference: uniqueReference,
      notification_url: `https://seusite.com/api/webhook/mercadopago`,
      metadata: {
        order_number: metadata.orderNumber,
        customer_email: metadata.customerEmail,
        customer_name: metadata.customerName,
        clerk_user_id: metadata.clerkUserId,
        unique_reference: uniqueReference
      },
      expires: false,
      binary_mode: false,
      marketplace: "none",
      marketplace_fee: 0,
      additional_info: "",
      statement_descriptor: "LOJA_ONLINE"
    };

    const clientWithIdempotency = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
      options: { timeout: 10000, idempotencyKey: uniqueReference }
    });

    const preferenceWithIdempotency = new Preference(clientWithIdempotency);
    const response = await preferenceWithIdempotency.create({ body: preferenceData });

    if (!response.id) {
      return NextResponse.json(
        { success: false, error: "Falha na criação da preferência", suggestion: "Verifique os dados enviados" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      order_number: metadata.orderNumber,
      total_amount: totalAmount,
      currency: "BRL"
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro ao criar checkout PIX:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro interno", suggestion: "Tente novamente" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "API do Mercado Pago PIX funcionando!", timestamp: new Date().toISOString(), environment: process.env.NODE_ENV, has_token: !!process.env.MERCADO_PAGO_ACCESS_TOKEN },
    { status: 200 }
  );
}
