'use client';

import { useEffect, useState } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import Container from './Container';
import SearchBar from './SearchBar';
import CartIcon from './CartIcon';

const Header = () => {
  const [mounted, setMounted] = useState(false);
  const { isLoaded } = useUser();

  // Evita problemas de hidratação aguardando o componente montar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Não renderiza até o componente estar montado e o Clerk carregado
  if (!mounted || !isLoaded) {
    return (
      <header className="border-b border-gray-200">
        <Container>
          <div className="max-w-screen-xl mx-auto flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {/* Logo ou nome do site */}
              <h1 className="text-xl font-bold">Seu Site</h1>
            </div>
            
            <div className="w-auto md:flex items-center space-x-4">
              <SearchBar />
              <CartIcon />
              {/* Placeholder para evitar layout shift */}
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </Container>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-200">
      <Container>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            {/* Logo ou nome do site */}
            <h1 className="text-xl font-bold">Seu Site</h1>
          </div>
          
          <div className="w-auto md:flex items-center space-x-4">
            <SearchBar />
            <CartIcon />
            
            {/* Componentes do Clerk com renderização condicional */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-semibold hover:text-darkColor hoverEffect">
                  Entrar
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;