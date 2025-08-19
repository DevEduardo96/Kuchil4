
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
});

const preference = new Preference(client);

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 Iniciando criação de preferência PIX...");

    // Verificar se o token está configurado
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ Token do Mercado Pago não configurado");
      return NextResponse.json(
        {
          error: "Configuração de pagamento não encontrada",
          details: "Token do Mercado Pago não está configurado no servidor",
          suggestion: "Verifique as variáveis de ambiente"
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    console.log("📊 Dados recebidos:", body);

    const { items, metadata } = body;

    // Validações detalhadas
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ Items inválidos:", items);
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: "Lista de produtos está vazia ou inválida",
          suggestion: "Adicione produtos ao carrinho antes de tentar o checkout"
        },
        { status: 400 }
      );
    }

    if (!metadata || !metadata.customerEmail || !metadata.customerName) {
      console.error("❌ Metadata inválidos:", metadata);
      return NextResponse.json(
        {
          error: "Dados do cliente incompletos",
          details: "Email ou nome do cliente não fornecidos",
          suggestion: "Verifique se você está logado corretamente"
        },
        { status: 400 }
      );
    }

    // Processar items do carrinho
    const mercadoPagoItems = items.map((item: any) => {
      const { product, quantity } = item;
      
      if (!product.price || isNaN(Number(product.price)) || Number(product.price) <= 0) {
        throw new Error(`Produto ${product.name} tem preço inválido: ${product.price}`);
      }

      return {
        id: product._id || product.id,
        title: product.name || "Produto sem nome",
        description: product.intro || product.description || "Produto da loja",
        category_id: product.category || "general",
        quantity: Number(quantity) || 1,
        currency_id: "BRL",
        unit_price: Number(product.price),
      };
    });

    console.log("📦 Items processados para Mercado Pago:", mercadoPagoItems);

    // Calcular total
    const totalAmount = mercadoPagoItems.reduce(
      (total, item) => total + (item.unit_price * item.quantity), 
      0
    );

    console.log("💰 Valor total calculado:", totalAmount);

    // Verificar se o total é válido
    if (totalAmount <= 0) {
      return NextResponse.json(
        {
          error: "Valor inválido",
          details: "O valor total da compra deve ser maior que zero",
          suggestion: "Verifique os preços dos produtos no carrinho"
        },
        { status: 400 }
      );
    }

    // Criar dados da preferência
    const preferenceData = {
      items: mercadoPagoItems,
      payer: {
        name: metadata.customerName,
        email: metadata.customerEmail,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart`,
      },
      auto_return: "approved" as const,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1,
      },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook/mercadopago`,
      statement_descriptor: "LOJA ONLINE",
      external_reference: metadata.orderNumber,
      expires: false,
      binary_mode: false,
      metadata: {
        customer_name: metadata.customerName,
        customer_email: metadata.customerEmail,
        clerk_user_id: metadata.clerkUserId,
        order_number: metadata.orderNumber,
      }
    };

    console.log("🎯 Dados da preferência:", JSON.stringify(preferenceData, null, 2));

    // Criar preferência no Mercado Pago
    const response = await preference.create({ body: preferenceData });
    
    console.log("✅ Resposta do Mercado Pago:", {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      status: response.response?.status
    });

    if (!response.id) {
      console.error("❌ Resposta do Mercado Pago sem ID:", response);
      return NextResponse.json(
        {
          error: "Erro na criação do pagamento",
          details: "Mercado Pago não retornou um ID de preferência válido",
          suggestion: "Tente novamente em alguns instantes"
        },
        { status: 500 }
      );
    }

    // Verificar se temos as URLs necessárias
    if (!response.init_point && !response.sandbox_init_point) {
      console.error("❌ URLs de checkout não encontradas:", response);
      return NextResponse.json(
        {
          error: "URLs de checkout não disponíveis",
          details: "Mercado Pago não retornou as URLs de redirecionamento",
          suggestion: "Verifique a configuração da conta no Mercado Pago"
        },
        { status: 500 }
      );
    }

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      qr_code: response.qr_code,
      qr_code_base64: response.qr_code_base64,
      ticket_url: response.ticket_url,
      metadata: {
        total_amount: totalAmount,
        items_count: mercadoPagoItems.length,
        order_number: metadata.orderNumber
      }
    });

  } catch (error: any) {
    console.error("❌ Erro na API do Mercado Pago:", error);
    
    // Tratar diferentes tipos de erro
    if (error.message?.includes("preço inválido")) {
      return NextResponse.json(
        {
          error: "Produto com preço inválido",
          details: error.message,
          suggestion: "Remova produtos com problemas do carrinho"
        },
        { status: 400 }
      );
    }

    if (error.status === 401) {
      return NextResponse.json(
        {
          error: "Erro de autenticação",
          details: "Token do Mercado Pago inválido ou expirado",
          suggestion: "Verifique as credenciais do Mercado Pago"
        },
        { status: 401 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.message || "Dados enviados são inválidos",
          suggestion: "Verifique os dados do carrinho e tente novamente"
        },
        { status: 400 }
      );
    }

    // Erro genérico
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message || "Erro desconhecido ao processar pagamento",
        suggestion: "Tente novamente em alguns instantes",
        debug_info: process.env.NODE_ENV === 'development' ? {
          error_type: error.constructor.name,
          error_stack: error.stack?.substring(0, 500)
        } : undefined
      },
      { status: 500 }
    );
  }
}
