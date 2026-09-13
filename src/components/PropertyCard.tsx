import React, { useState } from "react";
import {
  BedDouble,
  Car,
  Maximize2,
  Bath,
  MapPin,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  Share2,
  FileText,
  Key,
  BadgeDollarSign,
  ExternalLink,
} from "lucide-react";
import { PropertyListing } from "../types";
import { formatCurrency } from "../data/manaustowns";

interface PropertyCardProps {
  property: PropertyListing;
  isSelectedForCatalog: boolean;
  onToggleCatalog: (id: string) => void;
  onOpenDetails: (property: PropertyListing) => void;
  onQuickShareWhatsApp: (property: PropertyListing) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSelectedForCatalog,
  onToggleCatalog,
  onOpenDetails,
  onQuickShareWhatsApp,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images =
    property.images.length > 0
      ? property.images
      : [{ url: property.primaryImage, primary: true }];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImgUrl = images[currentImageIndex]?.url || property.primaryImage;

  const isRent = property.modalidade === "Locação";
  const isSale = property.modalidade === "Venda";

  return (
    <div
      id={`property-card-${property.id}`}
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col hover:shadow-md ${
        isSelectedForCatalog
          ? "border-rose-500 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/10"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      {/* Image Container with Slider & Badges */}
      <div
        className="relative aspect-16/10 bg-slate-100 overflow-hidden cursor-pointer"
        onClick={() => onOpenDetails(property)}
      >
        <img
          src={currentImgUrl}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Modalidade Badge (Venda vs Locação) */}
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-xs flex items-center gap-1 ${
                isRent
                  ? "bg-blue-600 text-white"
                  : isSale
                  ? "bg-rose-600 text-white"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {isRent ? (
                <Key className="w-3 h-3" />
              ) : (
                <BadgeDollarSign className="w-3 h-3" />
              )}
              <span>{property.modalidade || "Venda"}</span>
            </span>

            <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-900/85 text-white backdrop-blur-xs shadow-xs">
              {property.propertyCategory}
            </span>

            <span className="px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-white/90 text-slate-800 backdrop-blur-xs shadow-xs">
              {property.id}
            </span>
          </div>

          {/* Catalog Checkbox Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCatalog(property.id);
            }}
            className={`p-2 rounded-xl transition-all shadow-md flex items-center gap-1 text-xs font-bold ${
              isSelectedForCatalog
                ? "bg-rose-600 text-white ring-2 ring-white"
                : "bg-white/90 hover:bg-white text-slate-800 backdrop-blur-xs hover:scale-105"
            }`}
            title={isSelectedForCatalog ? "Remover do catálogo" : "Adicionar ao catálogo"}
          >
            {isSelectedForCatalog ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">No Catálogo</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Selecionar</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation Arrows for Photos */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
              title="Foto anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
              title="Próxima foto"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom Image Info: Photos Count & Zone */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs pointer-events-none">
          <div className="flex items-center gap-1.5 drop-shadow-md">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold">{property.location.neighborhood}</span>
            <span className="opacity-80 text-[11px]">• {property.location.zone}</span>
          </div>
          {images.length > 1 && (
            <span className="px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-medium backdrop-blur-xs">
              {currentImageIndex + 1}/{images.length} fotos
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price & Monthly costs */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                {formatCurrency(property.price)}
              </span>
              {isRent && (
                <span className="text-xs text-slate-500 font-medium ml-1">/mês</span>
              )}
            </div>
            {property.condoFee > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                Cond: {formatCurrency(property.condoFee)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onOpenDetails(property)}
            className="mt-2 text-sm font-bold text-slate-800 line-clamp-2 hover:text-rose-600 transition-colors cursor-pointer"
            title={property.title}
          >
            {property.title}
          </h3>

          {/* Specs grid */}
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-4 gap-2 text-slate-600 text-xs">
            {/* Living Area */}
            <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400 mb-1" />
              <span className="font-bold text-slate-800 text-[11px]">
                {property.livingArea || property.lotArea || "-"} m²
              </span>
              <span className="text-[9px] text-slate-400">Área útil</span>
            </div>

            {/* Bedrooms */}
            <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50">
              <BedDouble className="w-3.5 h-3.5 text-slate-400 mb-1" />
              <span className="font-bold text-slate-800 text-[11px]">
                {property.bedrooms || "-"}
              </span>
              <span className="text-[9px] text-slate-400">
                {property.suites ? `${property.suites} suíte(s)` : "Quartos"}
              </span>
            </div>

            {/* Bathrooms */}
            <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50">
              <Bath className="w-3.5 h-3.5 text-slate-400 mb-1" />
              <span className="font-bold text-slate-800 text-[11px]">
                {property.bathrooms || "-"}
              </span>
              <span className="text-[9px] text-slate-400">Banh.</span>
            </div>

            {/* Garage */}
            <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50">
              <Car className="w-3.5 h-3.5 text-slate-400 mb-1" />
              <span className="font-bold text-slate-800 text-[11px]">
                {property.garage || "-"}
              </span>
              <span className="text-[9px] text-slate-400">Vagas</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 flex items-center gap-1.5">
          <button
            onClick={() => onOpenDetails(property)}
            className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Ficha Completa</span>
          </button>

          <a
            href={`https://manaus.lopes.com.br/imovel/${property.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center justify-center gap-1 border border-rose-200/80"
            title="Clique para ver fotos e detalhes no site da Lopes"
          >
            <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
            <span>👉 Site ↗</span>
          </a>

          <button
            onClick={() => onQuickShareWhatsApp(property)}
            className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-emerald-200/60"
            title="Gerar texto formatado para WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
