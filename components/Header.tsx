
'use client';

import { useEffect, useState } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import Container from './Container';
import SearchBar from './SearchBar';
import CartIcon from './CartIcon';
import Logo from './Logo';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

const Header = () => {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoaded } = useUser();

  // Evita problemas de hidratação aguardando o componente montar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fecha o menu mobile quando a tela for redimensionada
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Não renderiza até o componente estar montado e o Clerk carregado
  if (!mounted || !isLoaded) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <Container>
          <div className="flex items-center justify-between py-3 md:py-4">
            {/* Logo */}
            <div className="flex items-center">
              <Logo className="text-lg md:text-xl">Tulos</Logo>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <SearchBar />
              <CartIcon />
              {/* Placeholder para evitar layout shift */}
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center space-x-2">
              <CartIcon />
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </Container>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <Container>
          <div className="flex items-center justify-between py-3 md:py-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Logo */}
            <div className="flex items-center">
              <Logo className="text-lg md:text-xl lg:text-2xl">Tulos</Logo>
            </div>
            
            {/* Desktop Navigation & Actions */}
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex items-center space-x-6">
                <Link href="/" className="text-sm font-medium hover:text-darkColor transition-colors">
                  Home
                </Link>
                <Link href="/products" className="text-sm font-medium hover:text-darkColor transition-colors">
                  Products
                </Link>
                <Link href="/about" className="text-sm font-medium hover:text-darkColor transition-colors">
                  About
                </Link>
                <Link href="/contact" className="text-sm font-medium hover:text-darkColor transition-colors">
                  Contact
                </Link>
              </nav>
              
              <div className="flex items-center space-x-4">
                <SearchBar />
                <CartIcon />
                
                {/* Componentes do Clerk */}
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm font-semibold hover:text-darkColor transition-colors px-3 py-1.5 border border-gray-300 rounded-md hover:border-darkColor">
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

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center space-x-2">
              <CartIcon />
              
              {/* Componentes do Clerk Mobile */}
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-xs font-semibold hover:text-darkColor transition-colors px-2 py-1 border border-gray-300 rounded text-center">
                    Entrar
                  </button>
                </SignInButton>
              </SignedOut>
              
              <SignedIn>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-7 h-7"
                    }
                  }}
                />
              </SignedIn>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3 border-t border-gray-100 pt-3">
            <SearchBar />
          </div>
        </Container>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <div className="relative z-50 bg-white w-64 h-full shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <Logo className="text-lg">Tulos</Logo>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <nav className="space-y-4">
                <Link 
                  href="/" 
                  className="block text-base font-medium hover:text-darkColor transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  href="/products" 
                  className="block text-base font-medium hover:text-darkColor transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Products
                </Link>
                <Link 
                  href="/about" 
                  className="block text-base font-medium hover:text-darkColor transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link 
                  href="/contact" 
                  className="block text-base font-medium hover:text-darkColor transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
