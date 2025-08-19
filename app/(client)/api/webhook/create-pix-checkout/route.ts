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
  
  // Debug das variáveis de ambiente
  console.log("🔑 Variáveis de ambiente:");
  console.log("MP_ACCESS_TOKEN existe:", !!process.env.MP_ACCESS_TOKEN);
  console.log("MP_ACCESS_TOKEN primeiros chars:", process.env.MP_ACCESS_TOKEN?.substring(0, 10) + "...");
  console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL);
  
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

      console.log(`📦 Item: ${item.product.name} - Qty: ${quantity} - Price: ${price}`);

      return {
        id: item.product._id, // Adiciona o campo 'id' exigido pelo Mercado Pago
        title: item.product.name,
        quantity: quantity,
        unit_price: price,
        currency_id: "BRL",
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
        ],
        default_payment_method_id: "pix",
      },
      back_urls: {
        success: `${baseUrl}/success?order=${metadata.orderNumber}`,
        failure: `${baseUrl}/cart`,
        pending: `${baseUrl}/cart`,
      },
      auto_return: "approved" as const,
      metadata: metadata,
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
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      id: response.id 
    });

  } catch (error) {
    console.error("❌ Erro detalhado:", error);
    
    // Tratamento específico do erro
    let errorMessage = "Erro desconhecido";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("📝 Mensagem:", error.message);
      console.error("📋 Stack:", error.stack);
    }

    return NextResponse.json(
      { 
        error: "Erro criando preferência PIX", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
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
    }
  });
}