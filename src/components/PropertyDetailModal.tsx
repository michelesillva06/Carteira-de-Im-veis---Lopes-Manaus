import React, { useState } from "react";
import {
  X,
  MapPin,
  BedDouble,
  Car,
  Maximize2,
  Bath,
  Check,
  Plus,
  FileDown,
  Share2,
  Copy,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  DollarSign,
  Send,
  Key,
  BadgeDollarSign,
} from "lucide-react";
import { PropertyListing, BrokerProfile } from "../types";
import { formatCurrency, createWhatsAppLink } from "../data/manaustowns";
import { translateAmenitiesList } from "../utils/amenitiesTranslator";
import {
  parsePropertyDescription,
  formatDescriptionForShare,
  generateWhatsAppPitch,
} from "../utils/descriptionFormatter";

interface PropertyDetailModalProps {
  property: PropertyListing | null;
  isOpen: boolean;
  onClose: () => void;
  isSelectedForCatalog: boolean;
  onToggleCatalog: (id: string) => void;
  brokerProfile: BrokerProfile;
  onPrintFlyer: (property: PropertyListing) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  isSelectedForCatalog,
  onToggleCatalog,
  brokerProfile,
  onPrintFlyer,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [pitchText, setPitchText] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTone, setAiTone] = useState<"professional" | "luxury" | "family" | "investor">("professional");

  React.useEffect(() => {
    setActivePhotoIndex(0);
    setPitchText("");
    setCopiedPitch(false);
  }, [property?.id, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;

  const images =
    property.images.length > 0
      ? property.images
      : [{ url: property.primaryImage, primary: true }];

  const currentImage = images[activePhotoIndex]?.url || property.primaryImage;

  const isRent = property.modalidade === "Locação";
  const isSale = property.modalidade === "Venda";

  const pricePerMeter =
    property.livingArea && property.livingArea > 0
      ? Math.round(property.price / property.livingArea)
      : null;

  const defaultPitch = () => {
    return generateWhatsAppPitch(property, brokerProfile);
  };

  const handleCopyPitch = () => {
    const textToCopy = pitchText || defaultPitch();
    navigator.clipboard.writeText(textToCopy);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleOpenWhatsAppShare = () => {
    const text = pitchText || defaultPitch();
    const url = createWhatsAppLink("", text);
    window.open(url, "_blank");
  };

  const handleGeneratePitchWithTone = (tone: "professional" | "luxury" | "family" | "investor") => {
    setAiTone(tone);
    setIsGeneratingAI(true);

    setTimeout(() => {
      let customPitch = "";
      const priceFormatted = formatCurrency(property.price) + (isRent ? "/mês" : "");

      if (tone === "luxury") {
        customPitch = `✨ *ALTO PADRÃO • ${property.location.neighborhood.toUpperCase()}*\n\nApresento este magnífico imóvel com acabamento de alto padrão e localização nobre:\n\n💎 *${property.title}*\n📍 ${property.location.neighborhood}\n💰 *Investimento:* ${priceFormatted}\n📐 *Área:* ${property.livingArea || property.lotArea} m²\n🛏️ ${property.bedrooms} Quartos ${property.suites ? `(${property.suites} Suítes)` : ""}\n🚗 ${property.garage} Vagas de Garagem\n\n${property.features.length > 0 ? `🏊‍♂️ *Lazer & Estrutura:* ${translateAmenitiesList(property.features).slice(0, 6).join(", ")}\n\n` : ""}Visitas exclusivas e atendimento personalizado:\n👤 ${brokerProfile.name} • ${brokerProfile.phone}`;
      } else if (tone === "investor") {
        customPitch = `📈 *ANÁLISE DE INVESTIMENTO • MANAUS*\n\nExcelente oportunidade para rentabilidade e valorização no bairro ${property.location.neighborhood}:\n\n🏢 *${property.title}*\n💵 *Valor:* ${priceFormatted}\n📊 *Valor/m²:* ${pricePerMeter ? formatCurrency(pricePerMeter) : "Sob consulta"}\n📐 *Área Privativa:* ${property.livingArea || property.lotArea} m²\n\n📌 *Diferenciais:* Alta demanda de locação na região.\n\nMais dados e agendamento:\n👤 ${brokerProfile.name} • ${brokerProfile.phone}`;
      } else if (tone === "family") {
        customPitch = `🏡 *O LAR PERFEITO PARA A SUA FAMÍLIA*\n\nEspaço, segurança e muito conforto no bairro ${property.location.neighborhood}:\n\n✨ *${property.title}*\n💰 *Valor:* ${priceFormatted}\n📐 *Metragem:* ${property.livingArea || property.lotArea} m² com excelente distribuição\n🛏️ ${property.bedrooms} Dormitórios para o conforto de todos\n🚗 ${property.garage} Vagas\n\nVenha conhecer de perto!\n📲 ${brokerProfile.name} • ${brokerProfile.phone}`;
      } else {
        customPitch = defaultPitch();
      }

      setPitchText(customPitch);
      setIsGeneratingAI(false);
    }, 250);
  };

  const parsedSections = parsePropertyDescription(property.description || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md shadow-lg transition"
          title="Fechar janela (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Photo Gallery Viewer */}
          <div className="space-y-3">
            <div className="relative aspect-16/9 sm:aspect-21/9 bg-slate-900 rounded-2xl overflow-hidden shadow-inner">
              <img
                src={currentImage}
                alt={property.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";
                }}
              />

              {/* Navigation buttons inside gallery */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActivePhotoIndex((prev) => (prev - 1 + images.length) % images.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition backdrop-blur-xs"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActivePhotoIndex((prev) => (prev + 1) % images.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition backdrop-blur-xs"
                    title="Próxima foto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Floating tags */}
              <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold shadow-md flex items-center gap-1 text-white ${
                    isRent ? "bg-blue-600" : "bg-rose-600"
                  }`}
                >
                  {isRent ? <Key className="w-3.5 h-3.5" /> : <BadgeDollarSign className="w-3.5 h-3.5" />}
                  <span>{property.modalidade}</span>
                </span>

                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900/90 text-white backdrop-blur-xs shadow-md">
                  {property.propertyCategory}
                </span>

                <span className="px-3 py-1 rounded-lg text-xs font-mono font-medium bg-white/90 text-slate-900 backdrop-blur-xs shadow-md">
                  ID: {property.id}
                </span>
              </div>

              <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-xs">
                Foto {activePhotoIndex + 1} de {images.length}
              </div>
            </div>

            {/* Thumbnail carousel */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                      activePhotoIndex === idx
                        ? "border-rose-600 ring-2 ring-rose-500/20"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Header Title & Pricing Block */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-200">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {property.location.neighborhood} • Zona {property.location.zone}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-heading leading-tight">
                  {property.title}
                </h1>
                {property.location.address && (
                  <p className="text-xs sm:text-sm text-slate-500">
                    {property.location.address}
                    {property.location.streetNumber ? `, ${property.location.streetNumber}` : ""}
                    {property.location.complement ? ` - ${property.location.complement}` : ""}
                  </p>
                )}
              </div>

              {/* Price Block & Action Buttons */}
              <div className="flex flex-col sm:items-end gap-3 shrink-0">
                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 font-medium block">
                    {isRent ? "Valor do Aluguel" : "Valor de Venda"}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-heading text-rose-600">
                    {formatCurrency(property.price)}
                    {isRent && <span className="text-sm font-normal text-slate-500 ml-1">/mês</span>}
                  </span>
                  {pricePerMeter && !isRent && (
                    <span className="block text-xs text-slate-500 font-medium mt-0.5">
                      {formatCurrency(pricePerMeter)} / m²
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onToggleCatalog(property.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                      isSelectedForCatalog
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                    }`}
                  >
                    {isSelectedForCatalog ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Na Apresentação</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Adicionar à Apresentação</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onPrintFlyer(property)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                    title="Baixar Ficha PDF deste Imóvel"
                  >
                    <FileDown className="w-4 h-4 text-rose-400" />
                    <span>Baixar Ficha PDF</span>
                  </button>

                  <a
                    href={`https://manaus.lopes.com.br/imovel/${property.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    title="Abrir página oficial do imóvel no portal da Lopes"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                    <span>👉 Clique para Ver Fotos no Site ↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Key Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Maximize2 className="w-3.5 h-3.5 text-rose-500" />
                  Área Útil
                </span>
                <span className="text-base font-bold text-slate-900">
                  {property.livingArea || property.lotArea || "-"} m²
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <BedDouble className="w-3.5 h-3.5 text-rose-500" />
                  Quartos
                </span>
                <span className="text-base font-bold text-slate-900">
                  {property.bedrooms || "-"} {property.suites ? `(${property.suites}s)` : ""}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Bath className="w-3.5 h-3.5 text-rose-500" />
                  Banheiros
                </span>
                <span className="text-base font-bold text-slate-900">
                  {property.bathrooms || "-"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Car className="w-3.5 h-3.5 text-rose-500" />
                  Vagas
                </span>
                <span className="text-base font-bold text-slate-900">
                  {property.garage || "-"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Building className="w-3.5 h-3.5 text-rose-500" />
                  Condomínio
                </span>
                <span className="text-base font-bold text-slate-900">
                  {property.condoFee ? formatCurrency(property.condoFee) : "Não informado"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                  IPTU Anual
                </span>
                <span className="text-base font-bold text-slate-900">
                  {property.yearlyTax ? formatCurrency(property.yearlyTax) : "Sob consulta"}
                </span>
              </div>
            </div>

            {/* Structured Description & Commercial Pitch */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
              {/* Left Column: Nicely Formatted Description & Features */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading flex items-center gap-2">
                    <span>Descrição Detalhada do Imóvel</span>
                  </h3>

                  {/* Formatted Sections with Emojis and Clean Paragraphs */}
                  <div className="space-y-3">
                    {parsedSections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/80 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-3"
                      >
                        {sec.title && (
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <span>{sec.emoji || "🏢"}</span>
                            <span>{sec.title}</span>
                          </h4>
                        )}

                        <div className="space-y-2.5">
                          {sec.paragraphs.map((p, pIdx) => (
                            <p
                              key={pIdx}
                              className="text-xs sm:text-sm text-slate-700 leading-relaxed"
                            >
                              {p}
                            </p>
                          ))}
                        </div>

                        {sec.bullets && sec.bullets.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sec.bullets.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className="text-xs text-slate-700 flex items-start gap-1.5"
                              >
                                <span className="text-rose-600 font-bold">▫️</span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features & Amenities */}
                {property.features && property.features.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading">
                      Comodidades & Diferenciais
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {translateAmenitiesList(property.features).map((feat, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 text-rose-600" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: WhatsApp Copy Generator */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold font-heading">
                        Apresentação para WhatsApp
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Pronto para envio
                    </span>
                  </div>

                  {/* Tone selector */}
                  <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl">
                    {[
                      { id: "professional", label: "Profissional" },
                      { id: "luxury", label: "Alto Padrão" },
                      { id: "family", label: "Família" },
                      { id: "investor", label: "Investidor" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() =>
                          handleGeneratePitchWithTone(
                            t.id as "professional" | "luxury" | "family" | "investor"
                          )
                        }
                        className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition ${
                          aiTone === t.id
                            ? "bg-rose-600 text-white shadow-2xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Text preview */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {pitchText || defaultPitch()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCopyPitch}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      {copiedPitch ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleOpenWhatsAppShare}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
                    >
                      <Send className="w-4 h-4" />
                      <span>Abrir WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Broker Info Box */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {brokerProfile.avatarUrl ? (
                      <img
                        src={brokerProfile.avatarUrl}
                        alt={brokerProfile.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                        {brokerProfile.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {brokerProfile.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {brokerProfile.creci ? `CRECI ${brokerProfile.creci}` : "Corretor Autorizado"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600">
                    {brokerProfile.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
