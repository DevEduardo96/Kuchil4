"use client";
import Container from "@/components/Container";
import EmptyCart from "@/components/EmptyCart";
import Loading from "@/components/Loading";
import NoAccessToCart from "@/components/NoAccessToCart";
import PriceFormatter from "@/components/PriceFormatter";
import QuantityButtons from "@/components/QuantityButtons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { urlFor } from "@/sanity/lib/image";
import useCartStore from "@/store";
import { useAuth, useUser } from "@clerk/nextjs";
import { Heart, ShoppingBag, Trash } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import paypalLogo from "@/images/paypalLogo.png";
import pixLogo from "@/images/pixLogo.png";
import {
  createCheckoutSession,
  Metadata,
} from "@/actions/createCheckoutSession";

const CartPage = () => {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useAuth();
  const {
    deleteCartProduct,
    getTotalPrice,
    getItemCount,
    getSubtotalPrice,
    resetCart,
    getGroupedItems,
  } = useCartStore();
  const { user } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <Loading />;
  }

  const cartProducts = getGroupedItems();

  const handleResetCart = () => {
    const confirmed = window.confirm("Are you sure to reset your Cart?");
    if (confirmed) {
      resetCart();
      toast.success("Your cart reset successfully!");
    }
  };

  const handleDeleteProduct = (id: string) => {
    deleteCartProduct(id);
    toast.success("Product deleted successfully!");
  };

  // Checkout Stripe
  const handleCheckout = async () => {
    setLoading(true);
    try {
      const metadata: Metadata = {
        orderNumber: crypto.randomUUID(),
        customerName: user?.fullName ?? "Unknown",
        customerEmail: user?.emailAddresses[0]?.emailAddress ?? "Unknown",
        clerkUserId: user!.id,
      };
      const checkoutUrl = await createCheckoutSession(cartProducts, metadata);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Erro ao processar checkout");
    } finally {
      setLoading(false);
    }
  };

  // Testar se a API existe
  const testApiRoute = async () => {
    try {
      const response = await fetch("/api/webhook/create-pix-checkout");
      const data = await response.text();
      console.log("🧪 Teste da rota:", response.status, data);
      if (response.ok) {
        toast.success("✅ Rota da API funcionando!");
      } else {
        toast.error("❌ Rota com problemas");
      }
    } catch (error) {
      console.error("❌ Erro testando rota:", error);
      toast.error("❌ Rota não encontrada");
    }
  };

  // Checkout PIX - Mercado Pago
  const handlePixCheckout = async () => {
    setLoading(true);
    
    try {
      if (!user) {
        toast.error("Você precisa estar logado para fazer checkout");
        return;
      }

      // Validar carrinho
      if (!cartProducts || cartProducts.length === 0) {
        toast.error("Seu carrinho está vazio");
        return;
      }

      // Validar dados do usuário
      const userEmail = user?.emailAddresses[0]?.emailAddress;
      const userName = user?.fullName;

      if (!userEmail || !userName) {
        toast.error("Dados do usuário incompletos. Verifique seu perfil.");
        return;
      }

      const metadata: Metadata = {
        orderNumber: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: userName,
        customerEmail: userEmail,
        clerkUserId: user.id,
      };

      console.log("🚀 Iniciando checkout PIX...");
      console.log("📊 Dados a enviar:", { items: cartProducts, metadata });

      // Mostrar loading mais específico
      toast.loading("Criando checkout PIX...", { id: "pix-checkout" });

      const res = await fetch("/api/webhook/create-pix-checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          items: cartProducts, 
          metadata 
        }),
      });

      console.log("📡 Status da resposta:", res.status);
      console.log("📋 Content-Type:", res.headers.get("content-type"));

      // Primeiro pegar a resposta como texto para debug
      const responseText = await res.text();
      console.log("📄 Resposta bruta:", responseText);

      // Verificar se recebeu HTML (erro 404/500)
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html') || responseText.startsWith('<meta')) {
        console.error("❌ Recebeu HTML em vez de JSON - Rota não encontrada ou erro no servidor");
        toast.error("Erro: Rota da API não encontrada. Verifique se /api/webhook/create-pix-checkout existe.", { id: "pix-checkout" });
        return;
      }

      // Tentar fazer parse do JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Erro ao fazer parse do JSON:", parseError);
        console.error("📄 Conteúdo recebido:", responseText.substring(0, 200));
        toast.error("Erro: Resposta inválida do servidor", { id: "pix-checkout" });
        return;
      }

      if (!res.ok) {
        console.error("❌ Erro na resposta da API:", data);
        const errorMsg = data.error || data.details || 'Erro desconhecido';
        toast.error(`Erro PIX: ${errorMsg}`, { id: "pix-checkout" });
        return;
      }

      console.log("✅ Resposta sucesso PIX:", data);

      // Verificar se recebeu os dados necessários
      if (!data?.init_point && !data?.sandbox_init_point) {
        console.error("❌ URLs de checkout não encontradas na resposta:", data);
        toast.error("Erro: URL de checkout não recebida", { id: "pix-checkout" });
        return;
      }

      // Determinar qual URL usar (sandbox para desenvolvimento, init_point para produção)
      const checkoutUrl = process.env.NODE_ENV === 'development' 
        ? (data.sandbox_init_point || data.init_point)
        : (data.init_point || data.sandbox_init_point);

      if (checkoutUrl) {
        console.log("✅ Redirecionando para checkout PIX:", checkoutUrl);
        toast.success("Redirecionando para o checkout PIX...", { id: "pix-checkout" });
        
        // Pequeno delay para mostrar o toast de sucesso
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 1000);
      } else {
        console.error("❌ Nenhuma URL de checkout válida encontrada");
        toast.error("Erro: URL de checkout inválida", { id: "pix-checkout" });
      }

    } catch (error) {
      console.error("❌ Erro criando checkout Pix:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao processar checkout PIX: ${errorMessage}`, { id: "pix-checkout" });
      
    } finally {tent-type"));

      // Primeiro pegar a resposta como texto para debug
      const responseText = await res.text();
      console.log("Resposta bruta:", responseText);

      // Verificar se recebeu HTML (erro 404/500)
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html') || responseText.startsWith('<meta')) {
        console.error("❌ Recebeu HTML em vez de JSON - Rota não encontrada ou erro no servidor");
        toast.error("Erro: Rota da API não encontrada. Verifique se /api/create-pix-checkout existe.");
        return;
      }

      // Tentar fazer parse do JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Erro ao fazer parse do JSON:", parseError);
        console.error("Conteúdo recebido:", responseText.substring(0, 200));
        toast.error("Erro: Resposta inválida do servidor");
        return;
      }

      if (!res.ok) {
        console.error("❌ Erro na resposta da API:", data);
        toast.error(`Erro: ${data.error || data.details || 'Erro desconhecido'}`);
        return;
      }

      console.log("✅ Resposta do checkout PIX:", data);

      if (data?.init_point) {
        console.log("✅ Redirecionando para:", data.init_point);
        window.location.href = data.init_point;
      } else {
        console.error("❌ init_point não encontrado na resposta:", data);
        toast.error("Erro: URL de checkout não recebida");
      }
    } catch (error) {
      console.error("❌ Erro criando checkout Pix:", error);
      toast.error(`Erro ao processar checkout PIX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 pb-52 md:pb-10">
      {isSignedIn ? (
        <Container>
          {cartProducts?.length ? (
            <>
              <div className="flex items-center gap-2 py-5">
                <ShoppingBag />
                <h1 className="text-2xl font-semibold">Shopping Cart</h1>
              </div>
              <div className="grid lg:grid-cols-3 md:gap-8">
                {/* Products */}
                <div className="lg:col-span-2 rounded-lg">
                  <div className="border bg-white rounded-md">
                    {cartProducts?.map(({ product }) => {
                      const itemCount = getItemCount(product?._id);
                      return (
                        <div
                          key={product?._id}
                          className="border-b p-2.5 last:border-b-0 flex items-center justify-between gap-5"
                        >
                          <div className="flex flex-1 items-center gap-2 h-36 md:h-44">
                            {product?.images && (
                              <Link
                                href={`/product/${product?.slug?.current}`}
                                className="border p-0.5 md:p-1 mr-2 rounded-md overflow-hidden group"
                              >
                                <Image
                                  src={urlFor(product?.images[0]).url()}
                                  alt="productImage"
                                  width={500}
                                  height={500}
                                  loading="lazy"
                                  className="w-32 md:w-40 h-32 md:h-40 object-cover group-hover:scale-105 overflow-hidden hoverEffect"
                                />
                              </Link>
                            )}
                            <div className="h-full flex flex-1 items-start flex-col justify-between py-1">
                              <div className="space-y-1.5">
                                <h2 className="font-semibold line-clamp-1">
                                  {product?.name}
                                </h2>
                                <p className="text-sm text-lightColor font-medium">
                                  {product?.intro}
                                </p>
                                <p className="text-sm capitalize">
                                  Variant:{" "}
                                  <span className="font-semibold">
                                    {product.variant}
                                  </span>
                                </p>
                                <p className="text-sm capitalize">
                                  Status:{" "}
                                  <span className="font-semibold">
                                    {product?.status}
                                  </span>
                                </p>
                              </div>
                              <div className="text-gray-500 flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Heart className="w-4 h-4 md:w-5 md:h-5 hover:text-green-600 hoverEffect" />
                                    </TooltipTrigger>
                                    <TooltipContent className="font-bold">
                                      Add to Favorite
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Trash
                                        onClick={() =>
                                          handleDeleteProduct(product?._id)
                                        }
                                        className="w-4 h-4 md:w-5 md:h-5 hover:text-red-600 hoverEffect"
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent className="font-bold bg-red-600">
                                      Delete product
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="flex flex-col items-start justify-between h-36 md:h-44 p-0.5 md:p-1">
                              <PriceFormatter
                                amount={(product?.price as number) * itemCount}
                                className="font-bold text-lg"
                              />
                              <QuantityButtons product={product} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      onClick={handleResetCart}
                      className="m-5 font-semibold"
                      variant="destructive"
                    >
                      Reset Cart
                    </Button>
                  </div>
                </div>

                {/* Summary - Desktop */}
                <div className="lg:col-span-1">
                  <div className="hidden md:inline-block w-full bg-white p-6 rounded-lg border">
                    <h2 className="text-xl font-semibold mb-4">
                      Order Summary
                    </h2>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <PriceFormatter amount={getSubtotalPrice()} />
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <PriceFormatter
                          amount={getSubtotalPrice() - getTotalPrice()}
                        />
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span>Total</span>
                        <PriceFormatter
                          amount={getTotalPrice()}
                          className="text-lg font-bold text-black"
                        />
                      </div>

                      {/* Stripe Checkout */}
                      <Button
                        disabled={loading}
                        onClick={handleCheckout}
                        className="w-full rounded-full font-semibold tracking-wide"
                        size="lg"
                      >
                        {loading ? "Processing..." : "Proceed to Checkout"}
                      </Button>

                      {/* PayPal */}
                      <Link
                        href={"/"}
                        className="flex items-center justify-center py-2 border border-darkColor/50 rounded-full hover:border-darkColor hover:bg-darkColor/5 hoverEffect"
                      >
                        <Image
                          src={paypalLogo}
                          alt="paypalLogo"
                          className="w-20"
                        />
                      </Link>

                      {/* Botão de Teste da API */}
                      <button
                        onClick={testApiRoute}
                        className="w-full py-2 border border-blue-600 rounded-full hover:bg-blue-50 hover:border-blue-700 hoverEffect text-sm text-blue-600"
                      >
                        🧪 Testar API PIX
                      </button>

                      {/* Pix Mercado Pago */}
                      <button
                        onClick={handlePixCheckout}
                        disabled={loading}
                        className="flex items-center justify-center w-full py-2 border border-green-600 rounded-full hover:bg-green-50 hover:border-green-700 hoverEffect disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="text-sm">Processando PIX...</span>
                        ) : (
                          <Image
                            src={pixLogo}
                            alt="pixLogo"
                            className="w-20"
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order summary for mobile view */}
                <div className="md:hidden fixed bottom-0 left-0 w-full bg-white pt-2">
                  <div className="p-4 rounded-lg border mx-4">
                    <h2 className="text-xl font-semibold mb-4">
                      Order Summary
                    </h2>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <PriceFormatter amount={getSubtotalPrice()} />
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <PriceFormatter
                          amount={getSubtotalPrice() - getTotalPrice()}
                        />
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span>Total</span>
                        <PriceFormatter
                          amount={getTotalPrice()}
                          className="text-lg font-bold text-black"
                        />
                      </div>

                      {/* Stripe */}
                      <Button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="w-full rounded-full font-semibold tracking-wide"
                        size="lg"
                      >
                        {loading ? "Processing..." : "Proceed to Checkout"}
                      </Button>

                      {/* PayPal */}
                      <Link
                        href={"/"}
                        className="flex items-center justify-center py-2 border border-darkColor/50 rounded-full hover:border-darkColor hover:bg-darkColor/5 hoverEffect"
                      >
                        <Image
                          src={paypalLogo}
                          alt="paypalLogo"
                          className="w-20"
                        />
                      </Link>

                      {/* Pix */}
                      <button
                        onClick={handlePixCheckout}
                        disabled={loading}
                        className="flex items-center justify-center w-full py-2 border border-green-600 rounded-full hover:bg-green-50 hover:border-green-700 hoverEffect disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="text-sm">Processando PIX...</span>
                        ) : (
                          <Image
                            src={pixLogo}
                            alt="pixLogo"
                            className="w-20"
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyCart />
          )}
        </Container>
      ) : (
        <NoAccessToCart />
      )}
    </div>
  );
};

export default CartPage;