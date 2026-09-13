import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Sparkles,
  BookOpen,
  RefreshCw,
  Search,
  Filter,
  SlidersHorizontal,
  Compass,
  MapPin,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Share2,
} from "lucide-react";
import {
  PropertyListing,
  FilterState,
  FeedMetadata,
  BrokerProfile,
  UserAccount,
} from "./types";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { PropertyCard } from "./components/PropertyCard";
import { PropertyDetailModal } from "./components/PropertyDetailModal";
import { CatalogBuilderModal } from "./components/CatalogBuilderModal";
import { BrokerProfileModal } from "./components/BrokerProfileModal";
import { FeedSyncModal } from "./components/FeedSyncModal";
import { LoginModal } from "./components/LoginModal";
import { UserManagementModal } from "./components/UserManagementModal";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { formatCurrency, createWhatsAppLink } from "./data/manaustowns";

const DEFAULT_BROKER: BrokerProfile = {
  name: "Michele Silva",
  creci: "5432-F AM",
  phone: "92993042722",
  email: "michele.sillva06@gmail.com",
  agencyName: "Lopes Manaus Parceiro",
  avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
};

const INITIAL_FILTERS: FilterState = {
  searchQuery: "",
  modalidade: "all",
  locationMode: "all",
  zone: "all",
  neighborhood: "all",
  propertyCategory: "all",
  minPrice: null,
  maxPrice: null,
  minBedrooms: null,
  minSuites: null,
  minGarage: null,
  minLivingArea: null,
  sortBy: "featured",
};

export default function App() {
  const [allProperties, setAllProperties] = useState<PropertyListing[]>([]);
  const [metadata, setMetadata] = useState<FeedMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [feedUrl, setFeedUrl] = useState<string>(
    "https://multimidia.lopes.com.br/portais/zap-lopesmanaus-v2.xml"
  );
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Modals state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [detailedProperty, setDetailedProperty] = useState<PropertyListing | null>(null);

  // Current logged in user from SQLite/persistence
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const savedUser = localStorage.getItem("lopes_current_user");
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Check auth on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUserStr = localStorage.getItem("lopes_current_user");
        let queryParam = "";
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed && parsed.id) {
              queryParam = `?userId=${encodeURIComponent(parsed.id)}`;
            }
          } catch {}
        }

        const res = await fetch(`/api/auth/me${queryParam}`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success && data.user) {
            const u: UserAccount = data.user;
            setCurrentUser(u);
            localStorage.setItem("lopes_current_user", JSON.stringify(u));
            setBrokerProfile((prev) => ({
              ...prev,
              name: u.name || prev.name,
              creci: u.creci || prev.creci,
              phone: u.phone || prev.phone,
              email: u.email || prev.email,
            }));
          } else if (data.success && data.user === null && queryParam) {
            // User was deleted or deactivated
            setCurrentUser(null);
            localStorage.removeItem("lopes_current_user");
          }
        }
      } catch (e) {
        console.warn("Auth check warning:", e);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("lopes_current_user", JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }

    const updatedProfile: BrokerProfile = {
      ...brokerProfile,
      name: user.name || brokerProfile.name,
      creci: user.creci || brokerProfile.creci,
      phone: user.phone || brokerProfile.phone,
      email: user.email || brokerProfile.email,
    };
    setBrokerProfile(updatedProfile);
    try {
      localStorage.setItem("lopes_broker_profile", JSON.stringify(updatedProfile));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id, userName: currentUser?.name }),
      });
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem("lopes_current_user");
    } catch (e) {
      console.error(e);
    }
  };

  // Broker profile state with local persistence
  const [brokerProfile, setBrokerProfile] = useState<BrokerProfile>(() => {
    try {
      const saved = localStorage.getItem("lopes_broker_profile");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BROKER;
  });

  const handleSaveBrokerProfile = (newProfile: BrokerProfile) => {
    setBrokerProfile(newProfile);
    try {
      localStorage.setItem("lopes_broker_profile", JSON.stringify(newProfile));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch properties from server
  const loadProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/properties");
      if (!res.ok) throw new Error("Falha ao carregar imóveis do servidor.");
      const data = await res.json();
      if (data.success) {
        setAllProperties(data.properties || []);
        setMetadata(data.metadata || null);
        setLastSyncTime(data.lastSyncTime || null);
        setFeedUrl(data.feedUrl || feedUrl);
        setSyncStatus(data.syncStatus || "success");
      } else {
        throw new Error(data.error || "Erro desconhecido.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão.");
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  // Trigger manual sync of XML feed
  const handleTriggerSync = async (newUrl?: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao sincronizar feed.");
      }
      await loadProperties();
    } catch (err: any) {
      setSyncStatus("error");
      throw err;
    }
  };

  // Client-side filtering for immediate, ultra-fast responses
  const filteredProperties = useMemo(() => {
    let list = [...allProperties];

    if (filters.modalidade !== "all") {
      list = list.filter(
        (p) => p.modalidade === filters.modalidade || p.modalidade === "Venda e Locação"
      );
    }

    if (filters.searchQuery.trim()) {
      const term = filters.searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      list = list.filter((p) => {
        const textToSearch = `${p.id} ${p.title} ${p.location.neighborhood} ${p.location.address} ${p.description}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return textToSearch.includes(term);
      });
    }

    if (filters.zone !== "all") {
      list = list.filter((p) => p.location.zone === filters.zone);
    }

    if (filters.neighborhood !== "all") {
      list = list.filter(
        (p) =>
          p.location.neighborhood.toLowerCase().trim() ===
          filters.neighborhood.toLowerCase().trim()
      );
    }

    if (filters.propertyCategory !== "all") {
      list = list.filter((p) => p.propertyCategory === filters.propertyCategory);
    }

    if (filters.minPrice !== null && filters.minPrice > 0) {
      list = list.filter((p) => p.price >= (filters.minPrice as number));
    }

    if (filters.maxPrice !== null && filters.maxPrice > 0) {
      list = list.filter((p) => p.price <= (filters.maxPrice as number));
    }

    if (filters.minBedrooms !== null) {
      list = list.filter((p) => p.bedrooms >= (filters.minBedrooms as number));
    }

    if (filters.minSuites !== null) {
      list = list.filter((p) => (p.suites || 0) >= (filters.minSuites as number));
    }

    if (filters.minGarage !== null) {
      list = list.filter((p) => p.garage >= (filters.minGarage as number));
    }

    if (filters.minLivingArea !== null) {
      list = list.filter((p) => (p.livingArea || p.lotArea) >= (filters.minLivingArea as number));
    }

    // Sort
    if (filters.sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === "area_desc") {
      list.sort((a, b) => (b.livingArea || b.lotArea) - (a.livingArea || a.lotArea));
    } else if (filters.sortBy === "bedrooms_desc") {
      list.sort((a, b) => b.bedrooms - a.bedrooms);
    }

    return list;
  }, [allProperties, filters]);

  // Catalog toggle handlers
  const handleToggleCatalog = (id: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddAllFromSearch = (modalidadeFilter?: string) => {
    let targets = filteredProperties;
    if (modalidadeFilter && modalidadeFilter !== "all") {
      targets = targets.filter(
        (p) => p.modalidade === modalidadeFilter || p.modalidade === "Venda e Locação"
      );
    }
    const ids = targets.map((p) => p.id);
    setSelectedPropertyIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearCatalog = () => {
    setSelectedPropertyIds([]);
  };

  const selectedPropertiesList = useMemo(() => {
    const set = new Set(selectedPropertyIds);
    return allProperties.filter((p) => set.has(p.id));
  }, [allProperties, selectedPropertyIds]);

  const handleSinglePropertyPrint = (property: PropertyListing) => {
    if (!selectedPropertyIds.includes(property.id)) {
      setSelectedPropertyIds([property.id]);
    }
    setDetailedProperty(null);
    setIsCatalogModalOpen(true);
  };

  const handleQuickShareWhatsApp = (property: PropertyListing) => {
    const isRent = property.modalidade === "Locação";
    const headerTitle = isRent ? "OPORTUNIDADE DE LOCAÇÃO" : "OPORTUNIDADE DE VENDA";
    const text = `*${headerTitle} - LOPES MANAUS* 🏢🔑\n\n*${property.title}*\n📍 *Bairro:* ${property.location.neighborhood} (${property.location.zone})\n💰 *Valor:* ${formatCurrency(property.price)}${isRent ? "/mês" : ""}\n📐 *Área:* ${property.livingArea || property.lotArea}m² | 🛏️ ${property.bedrooms} Quartos | 🚗 ${property.garage} Vagas\n\nCódigo: *${property.id}*\n\n📲 Mais informações com *${brokerProfile.name}* (CRECI ${brokerProfile.creci || "Lopes Manaus"}): ${brokerProfile.phone}`;
    window.open(createWhatsAppLink(brokerProfile.phone, text), "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Offline Status Warning if user loses connection */}
      <OfflineIndicator />

      {/* Top Header with live XML sync status */}
      <Header
        totalCount={allProperties.length}
        lastSyncTime={lastSyncTime}
        syncStatus={syncStatus}
        selectedCount={selectedPropertyIds.length}
        brokerProfile={brokerProfile}
        currentUser={currentUser}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenBrokerModal={() => setIsBrokerModalOpen(true)}
        onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Mobile Install App Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:hidden no-print">
        <PWAInstallButton variant="banner" />
      </div>

      {/* Portfolio Header Bar */}
      <section className="bg-white border-b border-slate-200/80 py-5 sm:py-6 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              Carteira de Imóveis Manaus
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Estoque oficial com dados em tempo real, fichas técnicas completas e exportação de lâminas comerciais.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Total em Carteira
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                  {allProperties.length} imóveis
                </span>
              </div>
              <span className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Bairros
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                  {metadata?.neighborhoods?.length || 49}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              title="Abrir gerador de catálogo"
            >
              <BookOpen className="w-4 h-4 text-rose-400" />
              <span>Catálogo ({selectedPropertyIds.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Advanced Filter Bar (Bairro, Zona, Preço, Categoria, etc.) */}
      <FilterBar
        filters={filters}
        onFilterChange={(newF) => setFilters((prev) => ({ ...prev, ...newF }))}
        onResetFilters={() => setFilters(INITIAL_FILTERS)}
        metadata={metadata}
        filteredCount={filteredProperties.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 no-print">
        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-16/10 bg-slate-200 rounded-xl" />
                <div className="h-6 bg-slate-200 rounded-md w-3/4" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="h-10 bg-slate-100 rounded-lg" />
                  <div className="h-10 bg-slate-100 rounded-lg" />
                  <div className="h-10 bg-slate-100 rounded-lg" />
                  <div className="h-10 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-3">
            <h3 className="text-base font-bold text-rose-900">
              Erro ao carregar os dados
            </h3>
            <p className="text-xs text-rose-700">{error}</p>
            <button
              onClick={() => loadProperties()}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty results */}
        {!loading && !error && filteredProperties.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Nenhum imóvel encontrado com esses critérios
              </h3>
              <p className="text-xs text-slate-500">
                Tente relaxar os filtros de bairro, zona ou faixa de preço para ver mais resultados.
              </p>
            </div>
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              Restaurar todos os filtros
            </button>
          </div>
        )}

        {/* Property Cards Grid */}
        {!loading && !error && filteredProperties.length > 0 && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSelectedForCatalog={selectedPropertyIds.includes(property.id)}
                  onToggleCatalog={handleToggleCatalog}
                  onOpenDetails={(p) => setDetailedProperty(p)}
                  onQuickShareWhatsApp={handleQuickShareWhatsApp}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Catalog Bar if items are selected */}
      {selectedPropertyIds.length > 0 && (
        <div className="sticky bottom-4 z-40 max-w-3xl mx-auto w-full px-4 no-print animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-xs text-white">
                {selectedPropertyIds.length}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? "imóvel selecionado" : "imóveis selecionados"} para o catálogo
                </p>
                <p className="text-[11px] text-slate-400 hidden xs:block">
                  Pronto para gerar lâmina PDF, envio no WhatsApp ou lookbook digital
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearCatalog}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                Limpar
              </button>
              <button
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30"
              >
                <BookOpen className="w-4 h-4" />
                <span>Gerar Catálogo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/favicon-lopes.png"
              alt="Lopes Manaus"
              className="w-4 h-4 object-contain"
            />
            <span className="font-bold text-slate-800">Lopes Manaus Imobiliária</span>
            <span>•</span>
            <span>Base Oficial Lopesnet</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-rose-600 transition flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ver Status da Conexão</span>
            </button>
            <button
              onClick={() => setIsBrokerModalOpen(true)}
              className="hover:text-rose-600 transition"
            >
              Configurar Corretor ({brokerProfile.name})
            </button>
          </div>
        </div>
      </footer>

      {/* Detailed Property Modal */}
      <PropertyDetailModal
        property={detailedProperty}
        isOpen={Boolean(detailedProperty)}
        onClose={() => setDetailedProperty(null)}
        isSelectedForCatalog={
          detailedProperty ? selectedPropertyIds.includes(detailedProperty.id) : false
        }
        onToggleCatalog={handleToggleCatalog}
        brokerProfile={brokerProfile}
        onPrintFlyer={handleSinglePropertyPrint}
      />

      {/* Digital Catalog & Flyer Generator Modal */}
      <CatalogBuilderModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        selectedProperties={selectedPropertiesList}
        onRemoveProperty={handleToggleCatalog}
        onClearAll={handleClearCatalog}
        onAddAllFromSearch={handleAddAllFromSearch}
        filteredCount={filteredProperties.length}
        brokerProfile={brokerProfile}
        onSelectPropertyToView={(p) => {
          setIsCatalogModalOpen(false);
          setDetailedProperty(p);
        }}
      />

      {/* Broker Profile Customizer Modal */}
      <BrokerProfileModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        profile={brokerProfile}
        onSave={handleSaveBrokerProfile}
      />

      {/* XML Feed Sync & Diagnostics Modal */}
      <FeedSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        feedUrl={feedUrl}
        lastSyncTime={lastSyncTime}
        syncStatus={syncStatus}
        metadata={metadata}
        onTriggerSync={handleTriggerSync}
      />

      {/* User Login & Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* User Accounts & System Audit Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
