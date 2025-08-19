
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Tipos para TypeScript
interface Product {
  _id: string;
  name: string;
  price: number;
  images?: any[];
  slug?: { current: string };
  intro?: string;
  variant?: string;
  status?: string;
}

interface CartItem {
  product: Product;
  quantity?: number;
}

interface Metadata {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  clerkUserId: string;
  [key: string]: unknown;
}

interface RequestBody {
  items: CartItem[];
  metadata: Metadata;
}

export async function POST(req: NextRequest) {
  console.log("🚀 API /api/webhook/create-pix-checkout chamada!");
  
  try {
    // Parse do corpo da requisição
    const body: RequestBody = await req.json();
    console.log("📦 Dados recebidos:", JSON.stringify(body, null, 2));
    
    const { items, metadata } = body;

    // Validações básicas
    if (!items || items.length === 0) {
      console.error("❌ Carrinho vazio");
      return NextResponse.json(
        { error: "Carrinho vazio" }, 
        { status: 400 }
      );
    }

    if (!metadata?.customerEmail || !metadata?.customerName) {
      console.error("❌ Dados do cliente incompletos");
      return NextResponse.json(
        { error: "Dados do cliente são obrigatórios" }, 
        { status: 400 }
      );
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      console.error("❌ Token do Mercado Pago não configurado");
      return NextResponse.json(
        { error: "Configuração do Mercado Pago ausente. Verifique MP_ACCESS_TOKEN" }, 
        { status: 500 }
      );
    }

    console.log("✅ Validações passaram, configurando Mercado Pago...");

    // Configuração do cliente Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const preference = new Preference(client);

    // Mapear itens do carrinho para formato do Mercado Pago
    const mpItems = items.map((item: CartItem) => {
      const quantity = item.quantity || 1;
      const price = Number(item.product.price);

      // Validar preço
      if (isNaN(price) || price <= 0) {
        throw new Error(`Preço inválido para o produto ${item.product.name}: ${price}`);
      }

      console.log(`📦 Item: ${item.product.name} - Qty: ${quantity} - Price: ${price}`);

      return {
        id: item.product._id,
        title: item.product.name.substring(0, 256), // Limite do Mercado Pago
        quantity: quantity,
        unit_price: price,
        currency_id: "BRL",
        category_id: "others",
        description: (item.product.intro || "Produto").substring(0, 256)
      };
    });

    console.log("🛒 Itens processados:", mpItems);

    // URLs base - usar URL do Replit se disponível
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://0.0.0.0:3000');

    console.log("🌐 Base URL:", baseUrl);

    // Dados da preferência
    const preferenceData = {
      items: mpItems,
      payer: {
        email: metadata.customerEmail,
        name: metadata.customerName,
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" }
        ],
        excluded_payment_methods: [
          { id: "visa" },
          { id: "master" }
        ],
        default_payment_method_id: "pix",
        installments: 1
      },
      back_urls: {
        success: `${baseUrl}/success?order=${metadata.orderNumber}&source=mercadopago`,
        failure: `${baseUrl}/cart?error=payment_failed`,
        pending: `${baseUrl}/cart?status=pending`,
      },
      auto_return: "approved" as const,
      external_reference: metadata.orderNumber,
      notification_url: `${baseUrl}/api/webhook/mercadopago`,
      expires: false,
      statement_descriptor: "Checkout PIX"
    };

    console.log("🔧 Criando preferência:", JSON.stringify(preferenceData, null, 2));

    // Criar preferência no Mercado Pago
    const response = await preference.create({ body: preferenceData });

    console.log("✅ Resposta do Mercado Pago:", {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    });

    // Retornar URLs de checkout
    return NextResponse.json({
      success: true,
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      qr_code: response.sandbox_init_point, // Para desenvolvimento
      expires_at: preferenceData.expiration_date_to
    });

  } catch (error: any) {
    console.error("❌ ERRO COMPLETO:", {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
      response: error?.response,
      name: error?.name,
      status: error?.status
    });
    
    // Tratamento específico do erro
    let errorMessage = "Erro interno do servidor";
    let statusCode = 500;
    let details = "Erro desconhecido";
    
    // Verificar erros de validação
    if (error?.message) {
      if (error.message.includes("Preço inválido")) {
        errorMessage = "Erro nos dados do produto";
        details = error.message;
        statusCode = 400;
      } else if (error.message.includes("Token")) {
        errorMessage = "Erro de configuração";
        details = "Credenciais do Mercado Pago inválidas";
        statusCode = 401;
      } else {
        details = error.message;
      }
    }

    // Verificar se é erro do Mercado Pago
    if (error?.cause) {
      console.error("🔍 Erro específico do Mercado Pago:", error.cause);
      
      if (error.cause.status === 401) {
        errorMessage = "Token de acesso inválido";
        details = "Verifique o MP_ACCESS_TOKEN";
        statusCode = 401;
      } else if (error.cause.status === 400) {
        errorMessage = "Dados inválidos";
        details = error.cause.message || "Parâmetros incorretos";
        statusCode = 400;
      } else if (error.cause.message) {
        details = error.cause.message;
      }
    }

    const errorResponse = { 
      error: errorMessage, 
      details: details,
      timestamp: new Date().toISOString(),
      suggestion: statusCode === 401 
        ? "Verifique as credenciais do Mercado Pago nas variáveis de ambiente"
        : "Verifique os dados enviados e tente novamente"
    };

    // Adicionar debug apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      errorResponse.debug = {
        originalError: error?.message,
        mpCause: error?.cause,
        stack: error?.stack?.split('\n').slice(0, 3)
      };
    }

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// Método GET para testar se a rota existe
export async function GET() {
  console.log("🧪 GET /api/webhook/create-pix-checkout - Rota funcionando!");
  
  // Debug das variáveis de ambiente
  const hasToken = !!process.env.MP_ACCESS_TOKEN;
  const tokenStart = process.env.MP_ACCESS_TOKEN?.substring(0, 10);
  
  return NextResponse.json({
    message: "API PIX funcionando!",
    timestamp: new Date().toISOString(),
    config: {
      hasToken,
      tokenStart: tokenStart + "...",
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "não configurada"
    },
    environment: process.env.NODE_ENV || "development"
  });
}
