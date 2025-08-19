
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  options: {
    timeout: 10000, // Aumentar timeout
    // Remover idempotencyKey fixo para evitar conflitos
  }
});

const preference = new Preference(client);

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 Iniciando criação de checkout PIX...");
    console.log("🔑 Token presente:", !!process.env.MERCADO_PAGO_ACCESS_TOKEN);
    console.log("🔑 Primeiros caracteres do token:", process.env.MERCADO_PAGO_ACCESS_TOKEN?.substring(0, 20) + "...");

    // Validar token de acesso
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ Token do Mercado Pago não configurado");
      return NextResponse.json(
        { 
          success: false, 
          error: "Token do Mercado Pago não configurado",
          suggestion: "Verifique as variáveis de ambiente"
        },
        { status: 500 }
      );
    }

    // Parse do body
    const body = await req.json();
    console.log("📋 Dados recebidos:", JSON.stringify(body, null, 2));

    const { items, metadata } = body;

    // Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ Items inválidos:", items);
      return NextResponse.json(
        { 
          success: false, 
          error: "Items são obrigatórios",
          suggestion: "Envie uma lista válida de produtos"
        },
        { status: 400 }
      );
    }

    if (!metadata || !metadata.customerEmail || !metadata.customerName) {
      console.error("❌ Metadata inválidos:", metadata);
      return NextResponse.json(
        { 
          success: false, 
          error: "Dados do cliente são obrigatórios",
          suggestion: "Envie email e nome do cliente"
        },
        { status: 400 }
      );
    }

    // Preparar items para o Mercado Pago
    const mercadoPagoItems = items.map((item: any) => {
      const product = item.product;
      const quantity = item.quantity || 1;
      const unitPrice = Number(product.price);

      if (isNaN(unitPrice) || unitPrice <= 0) {
        throw new Error(`Preço inválido para o produto ${product.name}: ${product.price}`);
      }

      return {
        id: product._id,
        title: product.name || "Produto sem nome",
        description: product.intro || product.description || "Produto da loja",
        quantity: quantity,
        unit_price: unitPrice,
        currency_id: "BRL",
        category_id: product.category || "others"
      };
    });

    console.log("🛒 Items processados:", mercadoPagoItems);

    // Calcular total
    const totalAmount = mercadoPagoItems.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    console.log("💰 Total calculado:", totalAmount);

    // Criar um ID único para cada preferência
    const uniqueReference = `${metadata.orderNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Configurar preferência do Mercado Pago
    const preferenceData = {
      items: mercadoPagoItems,
      payer: {
        name: metadata.customerName,
        email: metadata.customerEmail,
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" }
        ],
        excluded_payment_methods: [],
        default_payment_method_id: "pix",
        installments: 1
      },
      back_urls: {
        success: `https://8b99d11c-d036-4d1d-894b-a7b289a7dcc7-00-3unhqzfstcjkd.riker.replit.dev/success?session_id=${uniqueReference}`,
        failure: `https://8b99d11c-d036-4d1d-894b-a7b289a7dcc7-00-3unhqzfstcjkd.riker.replit.dev/cart?error=payment_failed`,
        pending: `https://8b99d11c-d036-4d1d-894b-a7b289a7dcc7-00-3unhqzfstcjkd.riker.replit.dev/cart?status=pending`
      },
      auto_return: "approved",
      external_reference: uniqueReference,
      notification_url: `https://8b99d11c-d036-4d1d-894b-a7b289a7dcc7-00-3unhqzfstcjkd.riker.replit.dev/api/webhook/mercadopago`,
      metadata: {
        order_number: metadata.orderNumber,
        customer_email: metadata.customerEmail,
        customer_name: metadata.customerName,
        clerk_user_id: metadata.clerkUserId,
        unique_reference: uniqueReference
      },
      // Remover expires para ambiente sandbox ou configurar corretamente
      expires: false,
      // Se quiser usar expiração, configure assim:
      // expires: true,
      // expiration_date_from: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos no futuro
      // expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      
      // Adicionar configurações para evitar problemas
      binary_mode: false,
      marketplace: "none",
      marketplace_fee: 0,
      additional_info: "",
      notification_url: `https://8b99d11c-d036-4d1d-894b-a7b289a7dcc7-00-3unhqzfstcjkd.riker.replit.dev/api/webhook/mercadopago`,
      statement_descriptor: "LOJA_ONLINE"
    };

    console.log("⚙️ Configuração da preferência:", JSON.stringify(preferenceData, null, 2));

    // Verificar se é token de sandbox (para desenvolvimento)
    const isTestToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.includes('APP_USR');
    console.log("🧪 Token de teste:", isTestToken);

    // Criar um cliente com idempotency key única para cada request
    const clientWithIdempotency = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
      options: {
        timeout: 10000,
        idempotencyKey: uniqueReference, // Usar referência única como idempotency key
      }
    });
    
    const preferenceWithIdempotency = new Preference(clientWithIdempotency);

    // Criar preferência no Mercado Pago
    const response = await preferenceWithIdempotency.create({ body: preferenceData });
    
    console.log("✅ Resposta do Mercado Pago:", {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    });

    // Verificar se a resposta é válida
    if (!response.id) {
      console.error("❌ Resposta inválida do Mercado Pago:", response);
      return NextResponse.json(
        { 
          success: false, 
          error: "Falha na criação da preferência",
          suggestion: "Verifique os dados enviados"
        },
        { status: 500 }
      );
    }

    // Retornar resposta de sucesso
    const successResponse = {
      success: true,
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      qr_code: response.qr_code,
      qr_code_base64: response.qr_code_base64,
      ticket_url: response.ticket_url,
      order_number: metadata.orderNumber,
      total_amount: totalAmount,
      currency: "BRL",
      expires_at: preferenceData.expiration_date_to
    };

    console.log("🎉 Checkout PIX criado com sucesso!");
    return NextResponse.json(successResponse, { status: 200 });

  } catch (error) {
    console.error("❌ Erro ao criar checkout PIX:", error);
    
    let errorMessage = "Erro interno do servidor";
    let suggestion = "Tente novamente ou entre em contato com o suporte";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("unauthorized")) {
        suggestion = "Verifique suas credenciais do Mercado Pago";
      } else if (error.message.includes("invalid")) {
        suggestion = "Verifique os dados enviados";
      } else if (error.message.includes("network") || error.message.includes("timeout")) {
        suggestion = "Problema de conexão. Tente novamente em alguns instantes";
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        suggestion,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: "API do Mercado Pago PIX funcionando!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      has_token: !!process.env.MERCADO_PAGO_ACCESS_TOKEN
    },
    { status: 200 }
  );
}

//comentario