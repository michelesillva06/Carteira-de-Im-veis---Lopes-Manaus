export interface PropertyLocation {
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
}

export interface PropertyImage {
  url: string;
  primary: boolean;
}

export interface PropertyContact {
  name: string;
  officeName: string;
  phone: string;
  email: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  transactionType: string;
  modalidade: "Venda" | "Locação" | "Venda e Locação";
  propertyType: string;
  propertyCategory: string;
  description: string;
  price: number;
  salePrice?: number;
  rentalPrice?: number;
  rentalPeriod?: string;
  lotArea: number;
  livingArea: number;
  condoFee: number;
  yearlyTax: number;
  bedrooms: number;
  bathrooms: number;
  suites: number;
  garage: number;
  features: string[];
  images: PropertyImage[];
  primaryImage: string;
  location: PropertyLocation;
  contact: PropertyContact;
}

export interface NeighborhoodStat {
  name: string;
  count: number;
  zone: string;
}

export interface ZoneStat {
  name: string;
  count: number;
}

export interface PropertyTypeStat {
  name: string;
  count: number;
}

export interface ModalidadeStat {
  name: string;
  count: number;
}

export interface FeedMetadata {
  total: number;
  modalidades: ModalidadeStat[];
  neighborhoods: NeighborhoodStat[];
  zones: ZoneStat[];
  propertyTypes: PropertyTypeStat[];
  priceStats: {
    min: number;
    max: number;
    average: number;
  };
}

export interface FilterState {
  searchQuery: string;
  modalidade: "all" | "Venda" | "Locação";
  locationMode: "all" | "neighborhood" | "zone";
  zone: string;
  neighborhood: string;
  propertyCategory: string;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  minSuites: number | null;
  minGarage: number | null;
  minLivingArea: number | null;
  sortBy: "featured" | "price_asc" | "price_desc" | "area_desc" | "bedrooms_desc";
}

export interface BrokerProfile {
  name: string;
  creci: string;
  phone: string;
  email: string;
  agencyName: string;
  avatarUrl: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "admin" | "gerente" | "corretor";
  creci: string;
  phone: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  ip: string;
}

export interface GeneratedCatalog {
  id: string;
  title: string;
  clientName: string;
  createdAt: string;
  propertyIds: string[];
  customNotes?: string;
}
