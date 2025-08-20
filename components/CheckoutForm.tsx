"use client";
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface CheckoutFormData {
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<CheckoutFormData>;
}

export default function CheckoutForm({ onSubmit, onCancel, loading = false, initialData }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    nome: initialData?.nome || '',
    email: initialData?.email || '',
    telefone: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    ...initialData
  });

  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CheckoutFormData> = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.telefone.trim()) newErrors.telefone = 'Telefone é obrigatório';
    if (!formData.cep.trim()) newErrors.cep = 'CEP é obrigatório';
    if (!/^\d{5}-?\d{3}$/.test(formData.cep.replace(/\D/g, ''))) newErrors.cep = 'CEP inválido';
    if (!formData.rua.trim()) newErrors.rua = 'Rua é obrigatória';
    if (!formData.numero.trim()) newErrors.numero = 'Número é obrigatório';
    if (!formData.bairro.trim()) newErrors.bairro = 'Bairro é obrigatório';
    if (!formData.cidade.trim()) newErrors.cidade = 'Cidade é obrigatória';
    if (!formData.estado.trim()) newErrors.estado = 'Estado é obrigatório';
    if (!formData.pais.trim()) newErrors.pais = 'País é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Dados para Checkout PIX</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>

            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Digite seu nome completo"
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && <span className="text-red-500 text-sm">{errors.nome}</span>}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className={errors.telefone ? 'border-red-500' : ''}
              />
              {errors.telefone && <span className="text-red-500 text-sm">{errors.telefone}</span>}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>

            <div>
              <Label htmlFor="cep">CEP *</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
                className={errors.cep ? 'border-red-500' : ''}
              />
              {errors.cep && <span className="text-red-500 text-sm">{errors.cep}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="rua">Rua *</Label>
                <Input
                  id="rua"
                  value={formData.rua}
                  onChange={(e) => handleInputChange('rua', e.target.value)}
                  placeholder="Nome da rua"
                  className={errors.rua ? 'border-red-500' : ''}
                />
                {errors.rua && <span className="text-red-500 text-sm">{errors.rua}</span>}
              </div>

              <div>
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  placeholder="123"
                  className={errors.numero ? 'border-red-500' : ''}
                />
                {errors.numero && <span className="text-red-500 text-sm">{errors.numero}</span>}
              </div>
            </div>

            <div>
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => handleInputChange('complemento', e.target.value)}
                placeholder="Apartamento, bloco, etc. (opcional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                  placeholder="Nome do bairro"
                  className={errors.bairro ? 'border-red-500' : ''}
                />
                {errors.bairro && <span className="text-red-500 text-sm">{errors.bairro}</span>}
              </div>

              <div>
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  placeholder="Nome da cidade"
                  className={errors.cidade ? 'border-red-500' : ''}
                />
                {errors.cidade && <span className="text-red-500 text-sm">{errors.cidade}</span>}
              </div>

              <div>
                <Label htmlFor="estado">Estado *</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value.toUpperCase())}
                  placeholder="SP"
                  maxLength={2}
                  className={errors.estado ? 'border-red-500' : ''}
                />
                {errors.estado && <span className="text-red-500 text-sm">{errors.estado}</span>}
              </div>
            </div>

            <div>
              <Label htmlFor="pais">País *</Label>
              <Input
                id="pais"
                value={formData.pais}
                onChange={(e) => handleInputChange('pais', e.target.value)}
                placeholder="Brasil"
                className={errors.pais ? 'border-red-500' : ''}
              />
              {errors.pais && <span className="text-red-500 text-sm">{errors.pais}</span>}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processando...' : 'Finalizar Checkout PIX'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}