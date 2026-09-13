import React, { useState, useMemo } from "react";
import {
  Search,
  MapPin,
  Compass,
  Home,
  BedDouble,
  Bath,
  Car,
  Maximize2,
  SlidersHorizontal,
  X,
  Key,
  BadgeDollarSign,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Building2,
} from "lucide-react";
import { FilterState, FeedMetadata } from "../types";
import {
  MANAUS_ZONES,
  PRICE_PRESETS,
  RENTAL_PRICE_PRESETS,
  PROPERTY_TYPES,
  formatCurrency,
} from "../data/manaustowns";

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  metadata: FeedMetadata | null;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  metadata,
  filteredCount,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Derive dynamic property types
  const dynamicPropertyTypes = useMemo(() => {
    const set = new Set<string>();
    if (metadata?.propertyTypes && metadata.propertyTypes.length > 0) {
      metadata.propertyTypes.forEach((pt) => {
        if (pt.name) set.add(pt.name);
      });
    }
    PROPERTY_TYPES.forEach((t) => {
      if (t !== "Todos os Tipos") set.add(t);
    });
    return Array.from(set).sort();
  }, [metadata]);

  // Total counts for tabs
  const countVenda =
    (metadata?.modalidades?.find((m) => m.name === "Venda")?.count || 0) +
    (metadata?.modalidades?.find((m) => m.name === "Venda e Locação")?.count || 0);

  const countLocacao =
    (metadata?.modalidades?.find((m) => m.name === "Locação")?.count || 0) +
    (metadata?.modalidades?.find((m) => m.name === "Venda e Locação")?.count || 0);

  const isLocacao = filters.modalidade === "Locação";
  const activePresets = isLocacao ? RENTAL_PRICE_PRESETS : PRICE_PRESETS;

  // Active advanced filters count
  const advancedFiltersCount = [
    filters.zone !== "all" ? 1 : 0,
    filters.minSuites !== null ? 1 : 0,
    filters.minGarage !== null ? 1 : 0,
    filters.minLivingArea !== null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const hasAnyFilter =
    Boolean(filters.searchQuery) ||
    filters.modalidade !== "all" ||
    filters.zone !== "all" ||
    filters.neighborhood !== "all" ||
    filters.propertyCategory !== "all" ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.minBedrooms !== null ||
    filters.minSuites !== null ||
    filters.minGarage !== null ||
    filters.minLivingArea !== null;

  // List of active filter tags for the summary bar
  const activeTags = useMemo(() => {
    const tags: { id: string; label: string; onRemove: () => void }[] = [];

    if (filters.modalidade !== "all") {
      tags.push({
        id: "modalidade",
        label: `Finalidade: ${filters.modalidade}`,
        onRemove: () => onFilterChange({ modalidade: "all" }),
      });
    }

    if (filters.searchQuery.trim()) {
      tags.push({
        id: "search",
        label: `Busca: "${filters.searchQuery}"`,
        onRemove: () => onFilterChange({ searchQuery: "" }),
      });
    }

    if (filters.neighborhood !== "all") {
      tags.push({
        id: "neighborhood",
        label: `Bairro: ${filters.neighborhood}`,
        onRemove: () => onFilterChange({ neighborhood: "all" }),
      });
    }

    if (filters.zone !== "all") {
      tags.push({
        id: "zone",
        label: `Zona: ${filters.zone}`,
        onRemove: () => onFilterChange({ zone: "all" }),
      });
    }

    if (filters.propertyCategory !== "all") {
      tags.push({
        id: "category",
        label: `Tipo: ${filters.propertyCategory}`,
        onRemove: () => onFilterChange({ propertyCategory: "all" }),
      });
    }

    if (filters.minPrice !== null || filters.maxPrice !== null) {
      const minText = filters.minPrice ? formatCurrency(filters.minPrice) : "R$ 0";
      const maxText = filters.maxPrice ? formatCurrency(filters.maxPrice) : "Sem limite";
      tags.push({
        id: "price",
        label: `Valor: ${minText} até ${maxText}`,
        onRemove: () => onFilterChange({ minPrice: null, maxPrice: null }),
      });
    }

    if (filters.minBedrooms !== null) {
      tags.push({
        id: "bedrooms",
        label: `${filters.minBedrooms}+ Quartos`,
        onRemove: () => onFilterChange({ minBedrooms: null }),
      });
    }

    if (filters.minSuites !== null) {
      tags.push({
        id: "suites",
        label: `${filters.minSuites}+ Suítes`,
        onRemove: () => onFilterChange({ minSuites: null }),
      });
    }

    if (filters.minGarage !== null) {
      tags.push({
        id: "garage",
        label: `${filters.minGarage}+ Vagas`,
        onRemove: () => onFilterChange({ minGarage: null }),
      });
    }

    if (filters.minLivingArea !== null) {
      tags.push({
        id: "area",
        label: `Área mín: ${filters.minLivingArea}m²`,
        onRemove: () => onFilterChange({ minLivingArea: null }),
      });
    }

    return tags;
  }, [filters, onFilterChange]);

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        
        {/* TOP LEVEL: PURPOSE TABS + MAIN SEARCH + SORT */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Operation Tab */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
            <button
              onClick={() => onFilterChange({ modalidade: "all" })}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                filters.modalidade === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Todos os Imóveis</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
                {metadata?.total || 0}
              </span>
            </button>

            <button
              onClick={() => onFilterChange({ modalidade: "Venda" })}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                filters.modalidade === "Venda"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BadgeDollarSign className="w-3.5 h-3.5" />
              <span>Comprar / Venda</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filters.modalidade === "Venda"
                    ? "bg-rose-700 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {countVenda || 111}
              </span>
            </button>

            <button
              onClick={() => onFilterChange({ modalidade: "Locação" })}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                filters.modalidade === "Locação"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Alugar / Locação</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filters.modalidade === "Locação"
                    ? "bg-blue-700 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {countLocacao || 46}
              </span>
            </button>
          </div>

          {/* Search Input & Sort Selector */}
          <div className="flex flex-1 items-center gap-2.5">
            {/* Global Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                placeholder="Buscar por código (ex: REO1204950), condomínio, bairro ou rua..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition text-slate-800 placeholder-slate-400 font-medium"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => onFilterChange({ searchQuery: "" })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 hover:bg-slate-100/60 transition">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                <option value="featured">Destaques</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="area_desc">Maior Área (m²)</option>
                <option value="bedrooms_desc">Mais Quartos</option>
              </select>
            </div>
          </div>
        </div>

        {/* MAIN FILTER CONTROLS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* 1. BAIRRO / LOCALIZAÇÃO */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Bairro / Localização</span>
            </label>

            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition">
              <select
                value={filters.neighborhood}
                onChange={(e) => onFilterChange({ neighborhood: e.target.value })}
                className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-none text-slate-800 font-semibold cursor-pointer truncate"
              >
                <option value="all">Todos os Bairros de Manaus</option>
                {(metadata?.neighborhoods || []).map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name} — {n.zone} ({n.count} imóveis)
                  </option>
                ))}
              </select>
              {filters.neighborhood !== "all" && (
                <button
                  onClick={() => onFilterChange({ neighborhood: "all" })}
                  className="p-0.5 text-slate-400 hover:text-slate-600 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. TIPO DE IMÓVEL */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-rose-600" />
              <span>Tipo de Imóvel</span>
            </label>

            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition">
              <select
                value={filters.propertyCategory}
                onChange={(e) => onFilterChange({ propertyCategory: e.target.value })}
                className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-none text-slate-800 font-semibold cursor-pointer truncate"
              >
                <option value="all">Todos os Tipos de Imóvel</option>
                {dynamicPropertyTypes.map((type) => {
                  const count =
                    metadata?.propertyTypes?.find((pt) => pt.name === type)?.count;
                  return (
                    <option key={type} value={type}>
                      {type} {count !== undefined ? `(${count})` : ""}
                    </option>
                  );
                })}
              </select>
              {filters.propertyCategory !== "all" && (
                <button
                  onClick={() => onFilterChange({ propertyCategory: "all" })}
                  className="p-0.5 text-slate-400 hover:text-slate-600 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. DORMITÓRIOS / QUARTOS */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-rose-600" />
              <span>Quartos (Mínimo)</span>
            </label>

            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
              {[
                { label: "Todos", val: null },
                { label: "1+", val: 1 },
                { label: "2+", val: 2 },
                { label: "3+", val: 3 },
                { label: "4+", val: 4 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onFilterChange({ minBedrooms: item.val })}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                    filters.minBedrooms === item.val
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. TOGGLE MAIS FILTROS BUTTON */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold text-transparent hidden lg:block select-none">
              Opções
            </label>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1.5 ${
                showAdvancedFilters || advancedFiltersCount > 0
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                <span>Mais Filtros</span>
              </span>
              <div className="flex items-center gap-1">
                {advancedFiltersCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {advancedFiltersCount}
                  </span>
                )}
                {showAdvancedFilters ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* FAIXA DE PREÇO BAR */}
        <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Min and Max Inputs */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
              <span>Faixa de Preço:</span>
              <span className="text-[10px] font-medium text-slate-500">
                ({isLocacao ? "R$/mês" : "R$ Venda"})
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="R$ Mín"
                value={filters.minPrice ?? ""}
                onChange={(e) =>
                  onFilterChange({
                    minPrice: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-24 sm:w-28 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-slate-800"
              />
              <span className="text-slate-400 text-xs font-bold">até</span>
              <input
                type="number"
                placeholder="R$ Máx"
                value={filters.maxPrice ?? ""}
                onChange={(e) =>
                  onFilterChange({
                    maxPrice: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-24 sm:w-28 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Quick Price Preset Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            {activePresets.map((preset) => {
              const isSelected =
                filters.minPrice === preset.min && filters.maxPrice === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onFilterChange({
                      minPrice: isSelected ? null : preset.min,
                      maxPrice: isSelected ? null : preset.max,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold transition border ${
                    isSelected
                      ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* EXPANDABLE ADVANCED FILTERS PANEL */}
        {showAdvancedFilters && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros Avançados de Especificações
              </span>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ZONA DE MANAUS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-rose-400" />
                  <span>Zona Geográfica de Manaus:</span>
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => onFilterChange({ zone: e.target.value })}
                  className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                >
                  <option value="all">Todas as Zonas</option>
                  {MANAUS_ZONES.filter((z) => z !== "Todas as Zonas").map((z) => {
                    const stat = metadata?.zones?.find((item) => item.name === z);
                    return (
                      <option key={z} value={z}>
                        {z} {stat ? `(${stat.count} imóveis)` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* SUÍTES */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-rose-400" />
                  <span>Suítes (Mínimo):</span>
                </label>
                <div className="flex bg-slate-800 rounded-xl p-1 gap-1 border border-slate-700">
                  {[
                    { label: "Todas", val: null },
                    { label: "1+", val: 1 },
                    { label: "2+", val: 2 },
                    { label: "3+", val: 3 },
                    { label: "4+", val: 4 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onFilterChange({ minSuites: item.val })}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                        filters.minSuites === item.val
                          ? "bg-rose-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* VAGAS DE GARAGEM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-rose-400" />
                  <span>Vagas de Garagem:</span>
                </label>
                <div className="flex bg-slate-800 rounded-xl p-1 gap-1 border border-slate-700">
                  {[
                    { label: "Todas", val: null },
                    { label: "1+", val: 1 },
                    { label: "2+", val: 2 },
                    { label: "3+", val: 3 },
                    { label: "4+", val: 4 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onFilterChange({ minGarage: item.val })}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                        filters.minGarage === item.val
                          ? "bg-rose-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ÁREA MÍNIMA (M²) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Área Mínima (m²):</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Ex: 100"
                    value={filters.minLivingArea ?? ""}
                    onChange={(e) =>
                      onFilterChange({
                        minLivingArea: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-semibold"
                  />
                  {filters.minLivingArea && (
                    <button
                      onClick={() => onFilterChange({ minLivingArea: null })}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS BAR + RESET + LIVE RESULT COUNT */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 mr-1">
              {filteredCount} {filteredCount === 1 ? "imóvel encontrado" : "imóveis encontrados"}
            </span>

            {activeTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80"
              >
                <span>{tag.label}</span>
                <button
                  onClick={tag.onRemove}
                  className="hover:text-rose-950 p-0.5 rounded-full hover:bg-rose-200/50"
                  title="Remover filtro"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {hasAnyFilter && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar todos os filtros</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
