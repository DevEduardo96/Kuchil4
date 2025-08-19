import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const preference = new Preference(client);

export async function POST(req: Request) {
  try {
    const { items, metadata } = await req.json();

    const preferenceData = {
      items: items.map((item: any) => ({
        title: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        currency_id: "BRL",
      })),
      payer: {
        email: metadata.customerEmail,
        name: metadata.customerName,
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
        ],
        default_payment_method_id: "pix",
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/success?order=${metadata.orderNumber}`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
      },
      auto_return: "approved",
      metadata: metadata,
    };

    const response = await preference.create({ body: preferenceData });

    return NextResponse.json({ 
      init_point: response.init_point,
      id: response.id 
    });
  } catch (err) {
    console.error("Erro criando preferência Mercado Pago:", err);
    return NextResponse.json(
      { error: "Erro criando preferência" }, 
      { status: 500 }
    );
  }
}