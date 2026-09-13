import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";
import { GoogleGenAI } from "@google/genai";
import * as archiverNamespace from "archiver";
import dotenv from "dotenv";
import { db, hashPassword } from "./server/db.ts";

dotenv.config();

// Helper to safely instantiate ZipArchive across archiver v8.x
function getZipArchiveInstance(options: any = { zlib: { level: 6 } }) {
  const mod: any = archiverNamespace;
  if (typeof mod.ZipArchive === "function") {
    return new mod.ZipArchive(options);
  }
  if (typeof mod.default === "function") {
    return mod.default("zip", options);
  }
  if (typeof mod === "function") {
    return mod("zip", options);
  }
  throw new Error("Módulo ZIP não disponível");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

const DEFAULT_FEED_URL = "https://multimidia.lopes.com.br/portais/zap-lopesmanaus-v2.xml";

// Zone classification for Manaus
const MANAUS_ZONE_MAP: Record<string, string> = {
  // Zona Oeste
  "ponta negra": "Zona Oeste",
  "taruma": "Zona Oeste",
  "tarumã": "Zona Oeste",
  "taruma-acu": "Zona Oeste",
  "tarumã-açu": "Zona Oeste",
  "taruma acu": "Zona Oeste",
  "santo agostinho": "Zona Oeste",
  "lirio do vale": "Zona Oeste",
  "lírio do vale": "Zona Oeste",
  "santo antonio": "Zona Oeste",
  "santo antônio": "Zona Oeste",
  "sao raimundo": "Zona Oeste",
  "são raimundo": "Zona Oeste",
  "compensa": "Zona Oeste",
  "gloria": "Zona Oeste",
  "glória": "Zona Oeste",
  "vila da prata": "Zona Oeste",
  "nova esperanca": "Zona Oeste",
  "nova esperança": "Zona Oeste",

  // Zona Centro-Sul
  "adrianopolis": "Zona Centro-Sul",
  "adrianópolis": "Zona Centro-Sul",
  "flores": "Zona Centro-Sul",
  "parque 10 de novembro": "Zona Centro-Sul",
  "parque dez de novembro": "Zona Centro-Sul",
  "parque 10": "Zona Centro-Sul",
  "aleixo": "Zona Centro-Sul",
  "aeroclube": "Zona Centro-Sul",
  "chapada": "Zona Centro-Sul",
  "sao geraldo": "Zona Centro-Sul",
  "são geraldo": "Zona Centro-Sul",
  "vieiralves": "Zona Centro-Sul",
  "nossa senhora das gracas": "Zona Centro-Sul",
  "nossa senhora das graças": "Zona Centro-Sul",

  // Zona Centro-Oeste
  "alvorada": "Zona Centro-Oeste",
  "planalto": "Zona Centro-Oeste",
  "dom pedro": "Zona Centro-Oeste",
  "dom pedro i": "Zona Centro-Oeste",
  "redencao": "Zona Centro-Oeste",
  "redenção": "Zona Centro-Oeste",
  "da paz": "Zona Centro-Oeste",

  // Zona Sul
  "centro": "Zona Sul",
  "japiim": "Zona Sul",
  "petropolis": "Zona Sul",
  "petrópolis": "Zona Sul",
  "raiz": "Zona Sul",
  "nossa senhora aparecida": "Zona Sul",
  "aparecida": "Zona Sul",
  "cachoeirinha": "Zona Sul",
  "praca 14 de janeiro": "Zona Sul",
  "praça 14 de janeiro": "Zona Sul",
  "sao francisco": "Zona Sul",
  "são francisco": "Zona Sul",
  "educandos": "Zona Sul",
  "betania": "Zona Sul",
  "betânia": "Zona Sul",
  "morro da liberdade": "Zona Sul",

  // Zona Norte
  "colonia terra nova": "Zona Norte",
  "colônia terra nova": "Zona Norte",
  "santa etelvina": "Zona Norte",
  "novo aleixo": "Zona Norte",
  "nova cidade": "Zona Norte",
  "cidade nova": "Zona Norte",
  "lago azul": "Zona Norte",
  "monte das oliveiras": "Zona Norte",

  // Zona Leste
  "coroado": "Zona Leste",
  "sao jose operario": "Zona Leste",
  "são josé operário": "Zona Leste",
  "gilberto mestrinho": "Zona Leste",
  "armando mendes": "Zona Leste",
  "jorge teixeira": "Zona Leste",
  "tancredo neves": "Zona Leste",
  "zumbi dos palmares": "Zona Leste",

  // Rural e Metropolitana
  "area rural de manaus": "Área Rural / RM",
  "área rural de manaus": "Área Rural / RM",
  "iranduba": "Região Metropolitana",
  "rio preto da eva": "Região Metropolitana",
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveZone(neighborhood: string, city: string = ""): string {
  const normNeigh = normalizeText(neighborhood || "");
  if (MANAUS_ZONE_MAP[normNeigh]) {
    return MANAUS_ZONE_MAP[normNeigh];
  }
  for (const [key, zone] of Object.entries(MANAUS_ZONE_MAP)) {
    if (normNeigh.includes(key) || key.includes(normNeigh)) {
      return zone;
    }
  }
  const normCity = normalizeText(city || "");
  if (normCity && !normCity.includes("manaus")) {
    return `Outras Cidades (${city})`;
  }
  return "Outras Regiões";
}

export interface PropertyListing {
  id: string;
  title: string;
  transactionType: string;
  modalidade: "Venda" | "Locação" | "Venda e Locação";
  propertyType: string;
  propertyCategory: string; // e.g. Apartamento, Casa, Terreno, Duplex, Sobrado, etc.
  description: string;
  price: number;
  salePrice: number;
  rentalPrice: number;
  rentalPeriod: string;
  lotArea: number;
  livingArea: number;
  condoFee: number;
  yearlyTax: number;
  bedrooms: number;
  bathrooms: number;
  suites: number;
  garage: number;
  features: string[];
  images: { url: string; primary: boolean }[];
  primaryImage: string;
  location: {
    country: string;
    state: string;
    city: string;
    neighborhood: string;
    address: string;
    streetNumber: string;
    complement: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
    zone: string;
  };
  contact: {
    name: string;
    officeName: string;
    phone: string;
    email: string;
  };
}

interface CacheState {
  lastSyncTime: string | null;
  feedUrl: string;
  status: "idle" | "syncing" | "success" | "error";
  errorMsg: string | null;
  listings: PropertyListing[];
  metadata: {
    total: number;
    modalidades: { name: string; count: number }[];
    neighborhoods: { name: string; count: number; zone: string }[];
    zones: { name: string; count: number }[];
    propertyTypes: { name: string; count: number }[];
    priceStats: {
      min: number;
      max: number;
      average: number;
    };
  };
}

let cache: CacheState = {
  lastSyncTime: null,
  feedUrl: DEFAULT_FEED_URL,
  status: "idle",
  errorMsg: null,
  listings: [],
  metadata: {
    total: 0,
    modalidades: [],
    neighborhoods: [],
    zones: [],
    propertyTypes: [],
    priceStats: { min: 0, max: 0, average: 0 },
  },
};

function categorizePropertyType(rawType: string, title: string = ""): string {
  const normType = normalizeText(rawType || "");
  const normTitle = normalizeText(title || "");

  // 1. Authoritative XML PropertyType from Zap/VivaReal/Lopes taxonomy
  if (normType.includes("apartment") || normType.includes("apartamento")) {
    return "Apartamento";
  }
  if (
    normType.includes("condo") ||
    normType.includes("casa de condominio") ||
    normType.includes("casa em condominio")
  ) {
    return "Casa em Condomínio";
  }
  if (normType.includes("sobrado")) {
    return "Sobrado";
  }
  if (normType.includes("penthouse") || normType.includes("cobertura")) {
    return "Cobertura";
  }
  if (
    normType.includes("kitnet") ||
    normType.includes("studio") ||
    normType.includes("flat")
  ) {
    return "Kitnet / Studio";
  }
  if (
    normType.includes("land lot") ||
    normType.includes("loteamento") ||
    normType.includes("terreno")
  ) {
    return "Terreno / Lote";
  }
  if (normType.includes("home") || normType.includes("casa")) {
    return "Casa";
  }
  if (normType.includes("office") || normType.includes("sala")) {
    return "Sala / Escritório";
  }
  if (
    normType.includes("edificio comercial") ||
    normType.includes("predio comercial")
  ) {
    return "Prédio Comercial";
  }
  if (
    normType.includes("industrial") ||
    normType.includes("galpao") ||
    normType.includes("galpão")
  ) {
    return "Galpão / Industrial";
  }
  if (
    normType.includes("agricultural") ||
    normType.includes("rural") ||
    normType.includes("chacara") ||
    normType.includes("sitio") ||
    normType.includes("fazenda")
  ) {
    return "Chácara / Sítio / Rural";
  }
  if (normType.includes("business") || normType.includes("comercial")) {
    return "Ponto / Imóvel Comercial";
  }

  // 2. Strict fallback only if rawType was missing or generic ("Residential", "Residencial", "Comercial")
  // Check Title ONLY with word boundaries to avoid false positives
  if (/\b(apartamento|apto|flat|studio)\b/i.test(normTitle)) return "Apartamento";
  if (/\b(casa em condom[ií]nio|condom[ií]nio fechado)\b/i.test(normTitle)) return "Casa em Condomínio";
  if (/\b(cobertura|penthouse)\b/i.test(normTitle)) return "Cobertura";
  if (/\b(sobrado)\b/i.test(normTitle)) return "Sobrado";
  if (/\b(casa|resid[eê]ncia)\b/i.test(normTitle)) return "Casa";
  if (/\b(terreno|lote|loteamento)\b/i.test(normTitle)) return "Terreno / Lote";
  if (/\b(galp[aã]o|industrial)\b/i.test(normTitle)) return "Galpão / Industrial";
  if (/\b(sala comercial|escrit[oó]rio)\b/i.test(normTitle)) return "Sala / Escritório";

  return rawType || "Residencial";
}

function sanitizeRawDescription(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let text = raw
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[\uFFFD\u00A0]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Fix glued upper/lower cases caused by stripped newlines
  text = text.replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1\n\n$2");
  text = text.replace(/([a-záàâãéèêíïóôõöúç]{2,})([A-Z][a-z]{2,})/g, "$1.\n\n$2");

  // Protect legitimate Portuguese questions (e.g., "Gostou?", "Quer conhecer?", "tanto?")
  text = text.replace(
    /\b(gostou|quer conhecer|tem interesse|quer saber|conhecer|tanto|duvida|duvidas|agendar|visita|im[oó]vel)\s*\?/gi,
    "$1__REAL_Q__"
  );

  // Clean corrupted question marks glued to bold asterisks
  text = text.replace(/\?+\s*(\*\*[^*]+\*\*)/g, "\n\n$1\n\n");
  text = text.replace(/(\*\*[^*]+\*\*)\s*\?+/g, "\n$1\n\n");
  text = text.replace(/(\*\*[^*]+\*\*)\s*([A-ZÀ-Úa-z0-9])/g, "$1\n\n$2");
  text = text.replace(/([A-ZÀ-Úa-z0-9])\s*(\*\*[A-ZÀ-Ú0-9])/g, "$1\n\n$2");

  // Corrupted question marks used as bullets or separators before specs
  text = text.replace(/\?+\s*([A-ZÀ-Ú0-9])/g, "\n• $1");
  text = text.replace(/([a-záàâãéèêíïóôõöúç0-9])\s*\?+\s*/gi, "$1\n• ");

  // Remove any remaining stray ?
  text = text.replace(/\?+/g, " ");

  // Restore real questions
  text = text.replace(/__REAL_Q__/g, "?");

  // Clean line breaks and spaces
  const cleanLines = text
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  return cleanLines.join("\n");
}

function extractNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "object") {
    const inner = val["#text"] ?? val.__cdata ?? val._text ?? val.value ?? 0;
    return parseFloat(String(inner).replace(/[^\d.-]/g, "")) || 0;
  }
  return parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;
}

const AMENITY_MAP_PTBR: Record<string, string> = {
  accessibility: "Acessibilidade para PCD",
  "adult party room": "Salão de Festas Adulto",
  "air conditioning": "Ar-condicionado",
  "air-conditioning": "Ar-condicionado",
  "air conditioning system": "Ar-condicionado",
  backyard: "Quintal",
  balcony: "Varanda / Sacada",
  bar: "Espaço Bar / Pub",
  barbecue: "Churrasqueira",
  "barbecue grill": "Churrasqueira",
  bbq: "Churrasqueira",
  "beauty salon": "Espaço Mulher / Salão de Beleza",
  "bicycles place": "Bicicletário",
  "bicycle rack": "Bicicletário",
  "builtin wardrobe": "Armários Embutidos",
  "built-in wardrobe": "Armários Embutidos",
  "built-in wardrobes": "Armários Embutidos",
  closet: "Closet Privativo",
  "convenience store": "Market / Loja de Conveniência",
  cooling: "Ar-condicionado / Climatizado",
  copa: "Copa Integrada",
  court: "Quadra Poliesportiva",
  "sport court": "Quadra Poliesportiva",
  "sports court": "Quadra Poliesportiva",
  coworking: "Espaço Coworking",
  deck: "Deck Molhado / Deck",
  elevator: "Elevador",
  lift: "Elevador",
  fitness: "Academia / Fitness",
  "game room": "Salão de Jogos",
  garage: "Garagem",
  gatehouse: "Portaria 24 Horas",
  guardhouse: "Portaria com Guarita",
  concierge: "Portaria 24h & Recepção",
  "gourmet balcony": "Varanda Gourmet",
  "gourmet area": "Espaço Gourmet",
  gym: "Academia / Fitness",
  "gas encanado": "Gás Encanado",
  "gas canalizado": "Gás Canalizado",
  hall: "Hall Social",
  hammock: "Redário",
  "hiking trail / path": "Pista de Caminhada",
  "hiking trail": "Pista de Caminhada",
  kitchen: "Cozinha Planejada",
  "kitchen cabinets": "Cozinha com Armários",
  "open kitchen": "Cozinha Americana",
  "lan house": "Espaço Web / Lan House",
  "lap pool": "Piscina com Raia",
  laundry: "Área de Serviço / Lavanderia",
  "service area": "Área de Serviço",
  living: "Sala de Estar Integrada",
  lobby: "Hall de Entrada / Lobby",
  "locker room": "Vestiários",
  lounge: "Espaço Lounge",
  "maid room": "Dependência de Empregada",
  "media room": "Sala de Cinema / TV",
  orchard: "Pomar",
  "outdoor adult pool": "Piscina Adulto",
  "outdoor children pool": "Piscina Infantil",
  "adult pool": "Piscina Adulto",
  "kids pool": "Piscina Infantil",
  pantry: "Despensa",
  "parking garage": "Garagem Coberta",
  "party room": "Salão de Festas",
  "paved street": "Rua Asfaltada / Pavimentada",
  "pet care": "Espaço Pet Care",
  "pet place": "Espaço Pet / Pet Place",
  "pets allowed": "Aceita Animais (Pet Friendly)",
  "pet friendly": "Aceita Animais (Pet Friendly)",
  "pizza oven": "Forno de Pizza",
  playground: "Playground Infantil",
  playroom: "Brinquedoteca",
  pool: "Piscina",
  "swimming pool": "Piscina",
  "port cochere": "Porte-Cochère",
  "porte cochere": "Porte-Cochère",
  "powder room": "Lavabo Social",
  lavatory: "Lavabo",
  "recreation area": "Área de Lazer Completa",
  rooftop: "Rooftop Panorâmico",
  "sand pit": "Quadra de Areia",
  sauna: "Sauna",
  security: "Segurança & Portaria 24h",
  "security 24h": "Segurança & Portaria 24h",
  services: "Área de Serviço",
  "skate parl": "Pista de Skate",
  "skate park": "Pista de Skate",
  "solar energy": "Energia Solar",
  solarium: "Solarium",
  spa: "Espaço Spa & Relaxamento",
  square: "Praça de Convivência",
  "tennis court": "Quadra de Tênis",
  "vegetable garden": "Horta Comunitária",
  "visitor parking": "Vagas para Visitantes",
  warehouse: "Depósito Privativo",
  "yoga/pilates room": "Espaço Yoga / Pilates",
  "zen space": "Espaço Zen",
  furnished: "Mobiliado",
  "semi furnished": "Semimobiliado",
  "cable tv": "TV a Cabo",
  internet: "Internet / Wi-Fi",
  garden: "Jardim",
  intercom: "Interfone",
  "alarm system": "Sistema de Alarme",
  cctv: "Câmeras de Segurança (CFTV)",
  "fenced yard": "Murado",
  generator: "Gerador de Energia",
  "water tank": "Caixa d'Água",
  cistern: "Cisterna / Poço",
  "artesian well": "Poço Artesiano",
  "river view": "Vista para o Rio Negro",
  "panoramic view": "Vista Panorâmica",
  "home office": "Home Office / Escritório",
  helipad: "Heliponto",
  "electric fence": "Cerca Elétrica",
  "automated gate": "Portão Eletrônico",
  fireplace: "Lareira",
  jacuzzi: "Hidromassagem",
  "porcelain floor": "Piso Porcelanato",
  "gated community": "Condomínio Fechado",
};

function translateFeatureToPtBr(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const clean = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .trim();

  if (AMENITY_MAP_PTBR[clean]) return AMENITY_MAP_PTBR[clean];

  for (const [key, val] of Object.entries(AMENITY_MAP_PTBR)) {
    if (clean === key || clean.includes(key)) return val;
  }

  // Capitalize properly if already in Portuguese
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

function parseModalidade(transactionType: string): "Venda" | "Locação" | "Venda e Locação" {
  const t = (transactionType || "").toLowerCase();
  const hasRent = t.includes("rent") || t.includes("loca") || t.includes("alug");
  const hasSale = t.includes("sale") || t.includes("vend");
  if (hasRent && hasSale) return "Venda e Locação";
  if (hasRent) return "Locação";
  return "Venda";
}

async function fetchAndParseFeed(feedUrl: string = DEFAULT_FEED_URL) {
  cache.status = "syncing";
  cache.feedUrl = feedUrl;
  console.log(`[FeedSync] Ingressing XML from: ${feedUrl}`);

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LopesCatalogSync/1.0)",
        Accept: "application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      cdataPropName: "__cdata",
      textNodeName: "#text",
      trimValues: true,
      parseTagValue: false,
    });

    const parsed = parser.parse(xmlText);
    const feed = parsed.ListingDataFeed || parsed;
    const listingsRaw = feed?.Listings?.Listing || [];
    const itemsArray = Array.isArray(listingsRaw) ? listingsRaw : [listingsRaw];

    const parsedListings: PropertyListing[] = [];
    const neighborhoodCounts: Record<string, { count: number; zone: string }> = {};
    const zoneCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const modalidadeCounts: Record<string, number> = { Venda: 0, "Locação": 0, "Venda e Locação": 0 };
    let sumPrice = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const item of itemsArray) {
      if (!item) continue;
      const id = String(item.ListingID || item.ListingId || "").trim();
      if (!id) continue;

      const title = String(item.Title || "").trim();
      const transactionType = String(item.TransactionType || "For Sale").trim();
      const modalidade = parseModalidade(transactionType);
      const details = item.Details || {};
      const rawDesc =
        typeof details.Description === "object"
          ? details.Description.__cdata || details.Description["#text"] || ""
          : String(details.Description || "").trim();
      const desc = sanitizeRawDescription(rawDesc);

      // Accurate price extraction (both ListPrice for sale and RentalPrice for rent)
      const salePrice = extractNumeric(
        details.ListPrice || details.Price || details.PrecoVenda || details.ValorVenda
      );
      const rentalPrice = extractNumeric(
        details.RentalPrice || details.PrecoLocacao || details.ValorLocacao || details.Aluguel
      );

      let price = 0;
      if (modalidade === "Locação") {
        price = rentalPrice || salePrice;
      } else if (modalidade === "Venda") {
        price = salePrice || rentalPrice;
      } else {
        price = salePrice || rentalPrice;
      }

      // Regex fallback if price still missing
      if (price === 0 && desc) {
        const matchRent = desc.match(/(?:aluguel|loca[çc][ãa]o)[^\d]{0,15}r\$\s*([\d\.,]+)/i);
        const matchSale = desc.match(/(?:valor|pre[çc]o|venda)[^\d]{0,15}r\$\s*([\d\.,]+)/i);
        const target = modalidade === "Locação" ? (matchRent || matchSale) : (matchSale || matchRent);
        if (target && target[1]) {
          const cleaned = target[1].replace(/\./g, "").replace(",", ".");
          price = parseFloat(cleaned) || 0;
        }
      }

      const lotArea = extractNumeric(details.LotArea);
      const livingArea = extractNumeric(details.LivingArea);
      const condoFee = extractNumeric(details.PropertyAdministrationFee || details.CondoFee);
      const yearlyTax = extractNumeric(details.YearlyTax || details.IPTU);

      const bedrooms = parseInt(String(details.Bedrooms || 0), 10) || 0;
      const bathrooms = parseInt(String(details.Bathrooms || 0), 10) || 0;
      const suites = parseInt(String(details.Suites || 0), 10) || 0;
      const garage = parseInt(String(details.Garage || 0), 10) || 0;

      // Features translated to standard PT-BR
      const featuresRaw = details.Features?.Feature || [];
      const featuresRawArray = (Array.isArray(featuresRaw) ? featuresRaw : [featuresRaw])
        .filter(Boolean)
        .map((f: any) => (typeof f === "object" ? f["#text"] || "" : String(f)).trim())
        .filter((f: string) => f.length > 0);

      const features: string[] = Array.from(
        new Set(
          featuresRawArray
            .map((f) => translateFeatureToPtBr(f))
            .filter((f) => Boolean(f) && f.trim().length > 0)
        )
      );

      // Media Images
      const mediaItems = item.Media?.Item || [];
      const mediaArray = Array.isArray(mediaItems) ? mediaItems : [mediaItems];
      const images: { url: string; primary: boolean }[] = [];

      for (const m of mediaArray) {
        if (!m) continue;
        const url = typeof m === "object" ? m["#text"] || m.__cdata || "" : String(m);
        if (url && typeof url === "string" && url.startsWith("http")) {
          const isPrimary = m["@_primary"] === "true" || m["@_primary"] === true;
          images.push({ url: url.trim(), primary: isPrimary });
        }
      }

      // Sort primary image first
      images.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
      const primaryImage =
        images[0]?.url ||
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

      // Location
      const loc = item.Location || {};
      const neighborhood = String(loc.Neighborhood || "Manaus").trim();
      const city = String(loc.City || "Manaus").trim();
      const zone = resolveZone(neighborhood, city);

      // Contact
      const contactInfo = item.ContactInfo || {};

      const rawPropType = String(details.PropertyType || "Residencial").trim();
      const category = categorizePropertyType(rawPropType, title);

      const listing: PropertyListing = {
        id,
        title: title || `${category} em ${neighborhood}`,
        transactionType,
        modalidade,
        propertyType: rawPropType,
        propertyCategory: category,
        description: desc,
        price,
        salePrice,
        rentalPrice,
        rentalPeriod: "Monthly",
        lotArea,
        livingArea: livingArea || lotArea,
        condoFee,
        yearlyTax,
        bedrooms,
        bathrooms,
        suites,
        garage,
        features,
        images,
        primaryImage,
        location: {
          country: String(loc.Country || "Brasil").trim(),
          state: String(loc.State || "AM").trim(),
          city,
          neighborhood,
          address: String(loc.Address || "").trim(),
          streetNumber: String(loc.StreetNumber || "").trim(),
          complement: String(loc.Complement || "").trim(),
          postalCode: String(loc.PostalCode || "").trim(),
          latitude: loc.Latitude ? parseFloat(loc.Latitude) : null,
          longitude: loc.Longitude ? parseFloat(loc.Longitude) : null,
          zone,
        },
        contact: {
          name: String(contactInfo.Name || "Lopes Manaus").trim(),
          officeName: String(contactInfo.OfficeName || "Lopes Manaus").trim(),
          phone: String(contactInfo.Telephone || "92993042722").trim(),
          email: String(contactInfo.Email || "contato@lopesmanaus.com.br").trim(),
        },
      };

      parsedListings.push(listing);

      // Aggregations
      if (!neighborhoodCounts[neighborhood]) {
        neighborhoodCounts[neighborhood] = { count: 0, zone };
      }
      neighborhoodCounts[neighborhood].count += 1;

      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
      typeCounts[category] = (typeCounts[category] || 0) + 1;
      modalidadeCounts[modalidade] = (modalidadeCounts[modalidade] || 0) + 1;

      if (price > 0) {
        sumPrice += price;
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;
      }
    }

    const total = parsedListings.length;
    const average = total > 0 && sumPrice > 0 ? Math.round(sumPrice / total) : 0;

    const sortedNeighborhoods = Object.entries(neighborhoodCounts)
      .map(([name, data]) => ({ name, count: data.count, zone: data.zone }))
      .sort((a, b) => b.count - a.count);

    const sortedZones = Object.entries(zoneCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedTypes = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedModalidades = Object.entries(modalidadeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    cache = {
      lastSyncTime: new Date().toISOString(),
      feedUrl,
      status: "success",
      errorMsg: null,
      listings: parsedListings,
      metadata: {
        total,
        modalidades: sortedModalidades,
        neighborhoods: sortedNeighborhoods,
        zones: sortedZones,
        propertyTypes: sortedTypes,
        priceStats: {
          min: minPrice === Infinity ? 0 : minPrice,
          max: maxPrice,
          average,
        },
      },
    };

    console.log(`[FeedSync] Synced successfully: ${total} properties parsed from ${feedUrl}`);
    return cache;
  } catch (err: any) {
    console.error("[FeedSync] Error syncing XML:", err);
    cache.status = "error";
    cache.errorMsg = err.message || "Erro ao baixar ou processar o arquivo XML da Lopes";
    throw err;
  }
}

// Initial sync on boot
fetchAndParseFeed(DEFAULT_FEED_URL).catch((err) => {
  console.warn("[FeedSync] Initial sync warning:", err.message);
});

// ==================== API ROUTES ====================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    totalProperties: cache.listings.length,
    lastSyncTime: cache.lastSyncTime,
  });
});

// Get properties with filtering and stats
app.get("/api/properties", (req, res) => {
  try {
    const {
      q,
      modalidade,
      zone,
      neighborhood,
      propertyCategory,
      minPrice,
      maxPrice,
      minBedrooms,
      minSuites,
      minGarage,
      minLivingArea,
      sortBy = "featured",
    } = req.query as Record<string, string | undefined>;

    let result = [...cache.listings];

    if (modalidade && modalidade !== "all") {
      result = result.filter(
        (p) => p.modalidade === modalidade || p.modalidade === "Venda e Locação"
      );
    }

    if (q && q.trim()) {
      const term = normalizeText(q);
      result = result.filter(
        (p) =>
          normalizeText(p.id).includes(term) ||
          normalizeText(p.title).includes(term) ||
          normalizeText(p.location.neighborhood).includes(term) ||
          normalizeText(p.location.address).includes(term) ||
          normalizeText(p.description).includes(term)
      );
    }

    if (zone && zone !== "all") {
      result = result.filter((p) => p.location.zone === zone);
    }

    if (neighborhood && neighborhood !== "all") {
      result = result.filter(
        (p) => normalizeText(p.location.neighborhood) === normalizeText(neighborhood)
      );
    }

    if (propertyCategory && propertyCategory !== "all") {
      result = result.filter((p) => p.propertyCategory === propertyCategory);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p) => p.price >= min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p) => p.price <= max);
      }
    }

    if (minBedrooms) {
      const beds = parseInt(minBedrooms, 10);
      if (!isNaN(beds)) {
        result = result.filter((p) => p.bedrooms >= beds);
      }
    }

    if (minSuites) {
      const suites = parseInt(minSuites, 10);
      if (!isNaN(suites)) {
        result = result.filter((p) => p.suites >= suites);
      }
    }

    if (minGarage) {
      const garage = parseInt(minGarage, 10);
      if (!isNaN(garage)) {
        result = result.filter((p) => p.garage >= garage);
      }
    }

    if (minLivingArea) {
      const area = parseFloat(minLivingArea);
      if (!isNaN(area)) {
        result = result.filter((p) => p.livingArea >= area);
      }
    }

    // Sorting
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "area_desc") {
      result.sort((a, b) => b.livingArea - a.livingArea);
    } else if (sortBy === "bedrooms_desc") {
      result.sort((a, b) => b.bedrooms - a.bedrooms);
    }

    res.json({
      success: true,
      totalCount: result.length,
      unfilteredCount: cache.listings.length,
      lastSyncTime: cache.lastSyncTime,
      feedUrl: cache.feedUrl,
      syncStatus: cache.status,
      metadata: cache.metadata,
      properties: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single property detail
app.get("/api/properties/:id", (req, res) => {
  const { id } = req.params;
  const prop = cache.listings.find((p) => p.id.toLowerCase() === id.toLowerCase());
  if (!prop) {
    return res.status(404).json({ success: false, message: "Imóvel não encontrado." });
  }
  res.json({ success: true, property: prop });
});

// Image Proxy with CORS headers to guarantee html2canvas export and crisp print
app.get("/api/image-proxy", async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send("URL da imagem não fornecida.");
    }
    const decodedUrl = decodeURIComponent(rawUrl);

    if (!decodedUrl.startsWith("http://") && !decodedUrl.startsWith("https://")) {
      return res.status(400).send("URL inválida.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const imgRes = await fetch(decodedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LopesCatalog/2.0)",
      },
    });
    clearTimeout(timeout);

    if (!imgRes.ok) {
      return res.status(imgRes.status).send("Falha ao buscar imagem original.");
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(buffer);
  } catch (err: any) {
    console.warn("[ImageProxy] Error:", err.message);
    res.status(500).send("Erro ao processar proxy de imagem.");
  }
});

// Download all photos of a property as a packaged .ZIP file
app.get("/api/properties/:id/download-images", async (req, res) => {
  const { id } = req.params;
  const prop = cache.listings.find((p) => p.id.toLowerCase() === id.toLowerCase());
  if (!prop) {
    return res.status(404).json({ success: false, message: "Imóvel não encontrado." });
  }

  const validImages = (prop.images || []).filter((img) => img && img.url);
  if (validImages.length === 0) {
    return res.status(400).json({ success: false, message: "Nenhuma imagem cadastrada para este imóvel." });
  }

  try {
    // Download photos in parallel with resilient browser headers and timeouts
    const fetchTasks = validImages.map(async (img, idx) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const imgRes = await fetch(img.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (imgRes.ok) {
          const arrayBuf = await imgRes.arrayBuffer();
          if (arrayBuf.byteLength > 200) {
            const buffer = Buffer.from(arrayBuf);
            const urlClean = img.url.split("?")[0];
            const rawExt = urlClean.split(".").pop()?.toLowerCase() || "jpg";
            const safeExt = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
            const filename = `${prop.id}_foto_${String(idx + 1).padStart(2, "0")}.${safeExt}`;
            return { name: filename, buffer };
          }
        }
      } catch (err: any) {
        console.warn(`[ImageDownload] Error fetching photo ${idx + 1} for ${id}:`, err.message);
      }
      return null;
    });

    const downloadedResults = await Promise.all(fetchTasks);
    const validFiles = downloadedResults.filter((f): f is { name: string; buffer: Buffer } => Boolean(f));

    if (validFiles.length === 0) {
      return res.status(502).json({
        success: false,
        message: "Não foi possível carregar as imagens do servidor de mídia da Lopes no momento.",
      });
    }

    // Build the ZIP archive completely in memory to guarantee no truncated stream
    const chunks: Buffer[] = [];
    const archive = getZipArchiveInstance({ zlib: { level: 6 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: any) => reject(err));
    });

    for (const file of validFiles) {
      archive.append(file.buffer, { name: file.name });
    }

    await archive.finalize();
    const zipBuffer = await zipPromise;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Lopes-Manaus-${prop.id}-Fotos.zip"`
    );
    res.setHeader("Cache-Control", "no-cache");
    res.send(zipBuffer);

    db.logAudit({
      userId: "usr_corretor",
      userName: "Corretor",
      userRole: "corretor",
      action: "BAIXOU_FOTOS_ZIP",
      details: `Baixou pacote ZIP com ${validFiles.length} fotos em alta resolução do imóvel ${prop.id} (${prop.title}).`,
      ip: req.ip || "127.0.0.1",
    });
  } catch (err: any) {
    console.error("[DownloadImages] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// ==================== AUTH & DATABASE USER MANAGEMENT ROUTES ====================

app.get("/api/auth/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId =
      (req.query.userId as string) ||
      (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : undefined);

    if (userId) {
      const user = db.findUserById(userId);
      if (user && user.active) {
        const { passwordHash: _, ...safeUser } = user;
        return res.json({ success: true, user: safeUser });
      }
    }

    res.json({ success: true, user: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "E-mail e senha são obrigatórios." });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: "E-mail ou senha incorretos." });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, message: "Esta conta está desativada. Contate o administrador." });
    }

    const hash = hashPassword(password);
    if (user.passwordHash !== hash) {
      return res.status(401).json({ success: false, message: "E-mail ou senha incorretos." });
    }

    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    db.recordLogin(user.id, clientIp);

    const { passwordHash: _, ...safeUser } = user;
    res.json({
      success: true,
      message: `Bem-vindo(a), ${safeUser.name}!`,
      user: safeUser,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const { userId, userName } = req.body || {};
  if (userId) {
    db.logAudit({
      userId,
      userName: userName || "Usuário",
      userRole: "corretor",
      action: "LOGOUT_EFETUADO",
      details: `Sessão encerrada pelo usuário.`,
      ip: req.ip || "127.0.0.1",
    });
  }
  res.json({ success: true, message: "Logout realizado com sucesso." });
});

app.get("/api/users", (_req, res) => {
  try {
    const users = db.getUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/users", (req, res) => {
  try {
    const { name, email, password, role, creci, phone, actor } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Nome, e-mail e senha são obrigatórios." });
    }

    const userActor = actor || { id: "usr_admin", name: "Administrador", role: "admin" };
    const clientIp = req.ip || "127.0.0.1";

    const newUser = db.createUser(
      { name, email, password, role: role || "corretor", creci, phone },
      userActor,
      clientIp
    );

    res.status(201).json({ success: true, message: "Usuário cadastrado com sucesso!", user: newUser });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.put("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, creci, phone, active, actor } = req.body || {};
    const userActor = actor || { id: "usr_admin", name: "Administrador", role: "admin" };
    const clientIp = req.ip || "127.0.0.1";

    const updated = db.updateUser(
      id,
      { name, email, password, role, creci, phone, active },
      userActor,
      clientIp
    );

    res.json({ success: true, message: "Usuário atualizado com sucesso!", user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { actor } = req.body || {};
    const userActor = actor || { id: "usr_admin", name: "Administrador", role: "admin" };
    const clientIp = req.ip || "127.0.0.1";

    db.deleteUser(id, userActor, clientIp);
    res.json({ success: true, message: "Usuário excluído com sucesso." });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get("/api/audit-logs", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = db.getAuditLogs(limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/audit-logs", (req, res) => {
  try {
    const { action, details, actor } = req.body || {};
    const userActor = actor || { id: "usr_anon", name: "Corretor", role: "corretor" };
    db.logAudit({
      userId: userActor.id,
      userName: userActor.name,
      userRole: userActor.role,
      action: action || "ACAO_SISTEMA",
      details: details || "Ação executada no sistema.",
      ip: req.ip || "127.0.0.1",
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual trigger or URL change to refresh XML
app.post("/api/sync", async (req, res) => {
  try {
    const { url } = req.body || {};
    const targetUrl = url && typeof url === "string" && url.trim().startsWith("http")
      ? url.trim()
      : cache.feedUrl || DEFAULT_FEED_URL;

    const data = await fetchAndParseFeed(targetUrl);
    res.json({
      success: true,
      message: `Feed XML sincronizado com sucesso! ${data.metadata.total} imóveis carregados.`,
      lastSyncTime: data.lastSyncTime,
      metadata: data.metadata,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Erro ao sincronizar: ${err.message}`,
      lastSyncTime: cache.lastSyncTime,
    });
  }
});

// AI Copywriting & Marketing Pitch for a property or selection of properties
app.post("/api/ai/pitch", async (req, res) => {
  try {
    const { property, brokerName, clientName, tone = "professional" } = req.body;
    if (!property) {
      return res.status(400).json({ error: "Dados do imóvel são obrigatórios." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return high quality deterministic template if API key is not configured
      const formatCurrency = (val: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

      const highlights = [
        property.bedrooms ? `🛏️ ${property.bedrooms} Quartos (${property.suites} suítes)` : null,
        property.garage ? `🚗 ${property.garage} Vagas de garagem` : null,
        property.livingArea ? `📐 ${property.livingArea}m² de área privativa` : null,
        property.condoFee ? `🏢 Condomínio: ${formatCurrency(property.condoFee)}/mês` : null,
      ].filter(Boolean).join("\n");

      const text = `🌟 *OPORTUNIDADE EXCLUSIVA EM MANAUS* 🌟\n\n*${property.title}*\n📍 *Localização:* ${property.location?.neighborhood || "Manaus"}, ${property.location?.zone || ""}\n💰 *Valor:* ${formatCurrency(property.price)}\n\n*Destaques do Imóvel:*\n${highlights}\n\n${property.description ? property.description.slice(0, 300) + "..." : ""}\n\n📲 *Agende sua visita com ${brokerName || "seu corretor parceiro"}!*\nCódigo do imóvel: ${property.id}`;

      return res.json({ success: true, pitch: text, provider: "fallback" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um especialista em marketing imobiliário de alto padrão e vendas na Lopes Manaus.
Crie um texto de apresentação irresistível e persuasivo para WhatsApp e redes sociais sobre o seguinte imóvel:

Título: ${property.title}
Código: ${property.id}
Tipo: ${property.propertyCategory}
Bairro: ${property.location?.neighborhood} (Zona: ${property.location?.zone})
Valor: R$ ${property.price?.toLocaleString("pt-BR")}
Área: ${property.livingArea} m²
Quartos: ${property.bedrooms} (${property.suites} suítes)
Vagas: ${property.garage}
Condomínio: R$ ${property.condoFee}
Diferenciais: ${property.features?.slice(0, 8).join(", ") || "Ótima localização"}
Descrição original: ${property.description?.slice(0, 400) || ""}

Nome do Corretor/Parceiro: ${brokerName || "Corretor Parceiro Lopes Manaus"}
Nome do Cliente (se houver): ${clientName || "Cliente"}
Tom: ${tone} (ex: elegante, persuasivo, direto, focado em investimento ou moradia familiar)

Instruções:
- Formate com emojis elegantes para WhatsApp.
- Destaque a localização em Manaus e os pontos fortes do bairro.
- Inclua chamada clara para ação (CTA) para agendar visita.
- Forneça texto pronto para envio direto.`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), 4500)
      );

      const response: any = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        }),
        timeoutPromise,
      ]);

      const generatedText = response?.text || "";
      if (generatedText) {
        return res.json({ success: true, pitch: generatedText, provider: "gemini" });
      }
    } catch (genError: any) {
      console.warn("[GeminiPitch] Falling back to template due to:", genError?.message);
    }

    // Fallback template if Gemini fails or is unreachable
    const formatCurr = (val: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

    const highlights = [
      property.bedrooms ? `🛏️ ${property.bedrooms} Quartos (${property.suites || 0} suítes)` : null,
      property.garage ? `🚗 ${property.garage} Vagas de garagem` : null,
      property.livingArea ? `📐 ${property.livingArea}m² de área privativa` : null,
      property.condoFee ? `🏢 Condomínio: ${formatCurr(property.condoFee)}/mês` : null,
    ].filter(Boolean).join("\n");

    const text = `🌟 *OPORTUNIDADE EXCLUSIVA LOPES MANAUS* 🌟\n\n*${property.title}*\n📍 *Localização:* ${property.location?.neighborhood || "Manaus"}, ${property.location?.zone || ""}\n💰 *Valor:* ${formatCurr(property.price)}\n\n*Destaques do Imóvel:*\n${highlights}\n\n${property.description ? property.description.slice(0, 320) + "..." : ""}\n\n📲 *Agende sua visita com ${brokerName || "seu corretor parceiro"}!*\nCódigo de referência: *${property.id}*`;

    return res.json({ success: true, pitch: text, provider: "fallback" });
  } catch (err: any) {
    console.error("[GeminiPitch] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Safeguard all unmatched /api/* routes to prevent Vite HTML fallback
app.all("/api/*", (_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint da API não encontrado." });
});

// ==================== STATIC ASSETS & VITE MIDDLEWARE / PRODUCTION ====================

app.use(express.static(path.join(process.cwd(), "public")));

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Real Estate Catalog System listening on port ${PORT}`);
  });
}

start();
