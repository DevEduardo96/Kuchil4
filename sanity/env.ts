// Função helper para validar variáveis obrigatórias
function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }
  return v
}

// Log para debugging - remova em produção
console.log('Environment variables:', {
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION
});

// Configurações do Sanity
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-12-15'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
)

// Configuração opcional - token para operações autenticadas
export const token = process.env.NEXT_PUBLIC_SANITY_TOKEN || ''

// URL base da API do Sanity
export const apiHost = process.env.NEXT_PUBLIC_SANITY_API_HOST || 'https://api.sanity.io'

// Configuração para preview mode (desenvolvimento)
export const previewSecretId = process.env.SANITY_PREVIEW_SECRET || 'preview-secret'

// Exporta todas as configurações como um objeto
export const sanityConfig = {
  apiVersion,
  dataset,
  projectId,
  token,
  apiHost,
  previewSecretId,
  // Configurações úteis para o cliente Sanity
  useCdn: process.env.NODE_ENV === 'production',
  perspective: 'published' as const,
}