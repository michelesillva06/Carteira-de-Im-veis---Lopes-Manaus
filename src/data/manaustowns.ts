export const MANAUS_ZONES = [
  "Todas as Zonas",
  "Zona Oeste",
  "Zona Centro-Sul",
  "Zona Sul",
  "Zona Norte",
  "Zona Leste",
  "Zona Centro-Oeste",
  "Área Rural / RM",
] as const;

export const PRICE_PRESETS = [
  { label: "Qualquer valor", min: null, max: null },
  { label: "Até R$ 350 mil", min: null, max: 350000 },
  { label: "R$ 350k a R$ 600 mil", min: 350000, max: 600000 },
  { label: "R$ 600k a R$ 1 milhão", min: 600000, max: 1000000 },
  { label: "R$ 1M a R$ 2 milhões", min: 1000000, max: 2000000 },
  { label: "Alto Padrão (> R$ 2M)", min: 2000000, max: null },
];

export const PROPERTY_TYPES = [
  "Todos os Tipos",
  "Apartamento",
  "Casa",
  "Casa em Condomínio",
  "Sobrado",
  "Cobertura",
  "Kitnet / Studio",
  "Terreno / Lote",
  "Sala / Escritório",
  "Ponto / Imóvel Comercial",
  "Galpão / Industrial",
  "Chácara / Sítio / Rural",
  "Prédio Comercial",
];

export const RENTAL_PRICE_PRESETS = [
  { label: "Qualquer valor", min: null, max: null },
  { label: "Até R$ 2.000/mês", min: null, max: 2000 },
  { label: "R$ 2.000 a R$ 4.000", min: 2000, max: 4000 },
  { label: "R$ 4.000 a R$ 7.000", min: 4000, max: 7000 },
  { label: "R$ 7.000 a R$ 12.000", min: 7000, max: 12000 },
  { label: "Acima de R$ 12.000/mês", min: 12000, max: null },
];

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Sob Consulta";
  if (value === 0) return "Sob Consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function createWhatsAppLink(phone: string, text: string): string {
  let cleaned = cleanPhone(phone);
  if (!cleaned.startsWith("55") && cleaned.length >= 10) {
    cleaned = `55${cleaned}`;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}
