
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
      options: {
        timeout: 5000,
        idempotencyKey: metadata.orderNumber
      }
    });

    const preference = new Preference(client);

    // Mapear itens do carrinho para formato do Mercado Pago
    const mpItems = items.map((item: CartItem) => {
      const quantity = item.quantity || 1;
      const price = Number(item.product.price);

      // Validar preço
      if (isNaN(price) || price <= 0) {
        throw new Error(`Preço inválido para o produto ${item.product.name}`);
      }

      console.log(`📦 Item: ${item.product.name} - Qty: ${quantity} - Price: ${price}`);

      return {
        id: item.product._id,
        title: item.product.name,
        quantity: quantity,
        unit_price: price,
        currency_id: "BRL",
        category_id: "clothing",
        description: item.product.intro || "Produto de vestuário"
      };
    });

    console.log("🛒 Itens processados:", mpItems);

    // URLs base
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Dados da preferência
    const preferenceData = {
      items: mpItems,
      payer: {
        email: metadata.customerEmail,
        name: metadata.customerName,
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "debit_card" },
          { id: "credit_card" }
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
      metadata: {
        ...metadata,
        integration: "pix_checkout",
        timestamp: new Date().toISOString()
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
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

  } catch (error) {
    console.error("❌ Erro detalhado:", error);
    
    // Tratamento específico do erro
    let errorMessage = "Erro desconhecido";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("📝 Mensagem:", error.message);
      console.error("📋 Stack:", error.stack);
      
      // Tratar erros específicos do Mercado Pago
      if (errorMessage.includes("401")) {
        errorMessage = "Token de acesso inválido";
        statusCode = 401;
      } else if (errorMessage.includes("400")) {
        errorMessage = "Dados inválidos enviados ao Mercado Pago";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { 
        error: "Erro criando preferência PIX", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
        suggestion: "Verifique as credenciais do Mercado Pago e os dados enviados"
      }, 
      { status: statusCode }
    );
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
