import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  BookOpen,
  Share2,
  Trash2,
  Eye,
  Send,
  Building2,
  Plus,
  Key,
  BadgeDollarSign,
  Filter,
  Check,
  Loader2,
  FileDown,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
} from "lucide-react";
import { PropertyListing, BrokerProfile } from "../types";
import { formatCurrency, createWhatsAppLink } from "../data/manaustowns";
import { translateAmenitiesList } from "../utils/amenitiesTranslator";
import { generateAndDownloadCatalogPDF, PDFGenerationProgress } from "../utils/canvasPdfGenerator";
import {
  parsePropertyDescription,
  formatDescriptionForShare,
  generatePdfSummary,
} from "../utils/descriptionFormatter";

interface CatalogBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProperties: PropertyListing[];
  onRemoveProperty: (id: string) => void;
  onClearAll: () => void;
  onAddAllFromSearch: (modalidadeFilter?: string) => void;
  filteredCount: number;
  brokerProfile: BrokerProfile;
  onSelectPropertyToView: (p: PropertyListing) => void;
}

export const CatalogBuilderModal: React.FC<CatalogBuilderModalProps> = ({
  isOpen,
  onClose,
  selectedProperties,
  onRemoveProperty,
  onClearAll,
  onAddAllFromSearch,
  filteredCount,
  brokerProfile,
  onSelectPropertyToView,
}) => {
  const [catalogTitle, setCatalogTitle] = useState("Seleção Exclusiva de Imóveis");
  const [clientName, setClientName] = useState("");
  const [customMessage, setCustomMessage] = useState(
    "Preparamos esta curadoria com as melhores oportunidades disponíveis no mercado de Manaus de acordo com o seu perfil."
  );
  const [viewMode, setViewMode] = useState<"builder" | "preview_web" | "whatsapp">("builder");

  // In-catalog filtering state
  const [filterModalidade, setFilterModalidade] = useState<"all" | "Venda" | "Locação">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PDFGenerationProgress | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered properties for current catalog view/export
  const displayedProperties = useMemo(() => {
    return selectedProperties.filter((p) => {
      if (filterModalidade !== "all") {
        if (p.modalidade !== filterModalidade && p.modalidade !== "Venda e Locação") {
          return false;
        }
      }
      if (filterCategory !== "all" && p.propertyCategory !== filterCategory) {
        return false;
      }
      return true;
    });
  }, [selectedProperties, filterModalidade, filterCategory]);

  // Counts for modalidade among selected
  const countVenda = selectedProperties.filter(
    (p) => p.modalidade === "Venda" || p.modalidade === "Venda e Locação"
  ).length;

  const countLocacao = selectedProperties.filter(
    (p) => p.modalidade === "Locação" || p.modalidade === "Venda e Locação"
  ).length;

  // Available categories among selected
  const availableCategories = Array.from(
    new Set(selectedProperties.map((p) => p.propertyCategory).filter(Boolean))
  );

  if (!isOpen) return null;

  const handleDownloadDirectPDF = async () => {
    if (displayedProperties.length === 0) {
      alert("Nenhum imóvel selecionado para gerar PDF.");
      return;
    }

    setPdfGenerating(true);
    setPdfProgress({
      currentPage: 1,
      totalPages: displayedProperties.length + 1,
      status: "Iniciando geração do PDF...",
    });

    try {
      const safeTitle = (catalogTitle || "Catalogo-Lopes-Manaus")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();
      const fileName = `${safeTitle}-${Date.now()}`;

      await generateAndDownloadCatalogPDF(
        displayedProperties,
        catalogTitle,
        clientName,
        brokerProfile,
        fileName,
        (progress) => setPdfProgress(progress)
      );

      // Register audit
      try {
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "usr_corretor",
            userName: brokerProfile.name,
            userRole: "corretor",
            action: "DOWNLOAD_CATALOG_PDF",
            details: `Baixou catálogo PDF "${catalogTitle}" com ${displayedProperties.length} lâminas.`,
          }),
        });
      } catch (err) {
        console.error(err);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao gerar PDF: " + (err.message || "Tente imprimir em PDF diretamente"));
    } finally {
      setPdfGenerating(false);
      setPdfProgress(null);
    }
  };

  // WhatsApp summary of displayed catalog
  const getWhatsAppCatalogSummary = () => {
    let text = `✨ *${catalogTitle.toUpperCase()}* ✨\n`;
    if (clientName) {
      text += `Olá, *${clientName}*! Tudo bem?\n`;
    }
    text += `${customMessage}\n\n`;

    const modalidadeNote =
      filterModalidade === "Locação"
        ? " (Apenas Imóveis para Alugar)"
        : filterModalidade === "Venda"
        ? " (Apenas Imóveis para Venda)"
        : "";

    text += `📋 *${displayedProperties.length} Oportunidades Selecionadas${modalidadeNote}:*\n\n`;

    displayedProperties.forEach((p, idx) => {
      const isRent = p.modalidade === "Locação";
      text += `*${idx + 1}. [${p.modalidade.toUpperCase()}] ${p.title}*\n`;
      text += `📍 ${p.location.neighborhood} (${p.location.zone})\n`;
      text += `💰 Valor: *${formatCurrency(p.price)}${isRent ? "/mês" : ""}*\n`;
      text += `📐 Área: ${p.livingArea || p.lotArea}m² | 🛏️ ${p.bedrooms} qts (${p.suites} suítes) | 🚗 ${p.garage} vagas\n`;
      if (p.condoFee > 0) text += `🏢 Condomínio: ${formatCurrency(p.condoFee)}\n`;
      text += `Código: *${p.id}*\n`;
      text += `🔗 *Ver no Site:* https://manaus.lopes.com.br/imovel/${p.id}\n\n`;
    });

    text += `Deseja agendar uma visita para conhecer de perto alguma dessas opções?\n\n`;
    text += `Atenciosamente,\n*${brokerProfile.name}*\n`;
    if (brokerProfile.creci) text += `CRECI: ${brokerProfile.creci} | Lopes Manaus\n`;
    text += `📲 WhatsApp: ${brokerProfile.phone}`;

    return text;
  };

  const whatsappMessage = getWhatsAppCatalogSummary();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col animate-in fade-in duration-150">
        {/* Header Bar */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-bold font-heading">
                    Gerador de Apresentação
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {selectedProperties.length} {selectedProperties.length === 1 ? "imóvel" : "imóveis"}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                  Monte a seleção e baixe em PDF, envie por WhatsApp ou compartilhe online
                </p>
              </div>
            </div>

            {/* Mobile-only close button */}
            <button
              onClick={onClose}
              className="sm:hidden p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition flex items-center justify-center shrink-0 border border-slate-700"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs & Desktop Close Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode("builder")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  viewMode === "builder"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Seleção ({selectedProperties.length})
              </button>

              <button
                onClick={() => setViewMode("preview_web")}
                disabled={displayedProperties.length === 0}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-40 shrink-0 ${
                  viewMode === "preview_web"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Prévia Online</span>
              </button>

              <button
                onClick={() => setViewMode("whatsapp")}
                disabled={displayedProperties.length === 0}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-40 shrink-0 ${
                  viewMode === "whatsapp"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Desktop Dedicated Close Button */}
            <button
              onClick={onClose}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition text-xs font-bold shrink-0 border border-slate-700 shadow-xs"
              title="Fechar janela (ESC)"
            >
              <X className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 bg-slate-50">
          {/* VIEW: CURATION BUILDER */}
          {viewMode === "builder" && (
            <div className="p-5 sm:p-8 space-y-6 max-w-5xl mx-auto">
              {/* Top settings box */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                  Dados da Apresentação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título da Apresentação
                    </label>
                    <input
                      type="text"
                      value={catalogTitle}
                      onChange={(e) => setCatalogTitle(e.target.value)}
                      placeholder="Ex: Oportunidades no Adrianópolis & Ponta Negra"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do Cliente (Opcional)
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Dr. Roberto / Sra. Mariana"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mensagem de Apresentação
                  </label>
                  <textarea
                    rows={2}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* IN-CATALOG FILTER BAR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                    <Filter className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Filtrar seleção</span>
                  </div>

                  {/* Modalidade filter buttons */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setFilterModalidade("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        filterModalidade === "all"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Todos ({selectedProperties.length})
                    </button>
                    <button
                      onClick={() => setFilterModalidade("Venda")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        filterModalidade === "Venda"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <BadgeDollarSign className="w-3 h-3" />
                      <span>Venda ({countVenda})</span>
                    </button>
                    <button
                      onClick={() => setFilterModalidade("Locação")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        filterModalidade === "Locação"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Key className="w-3 h-3" />
                      <span>Locação ({countLocacao})</span>
                    </button>
                  </div>

                  {/* Category select */}
                  {availableCategories.length > 1 && (
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-slate-100 border-0 rounded-xl font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="all">Todos os Tipos</option>
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedProperties.length > 0 && (
                    <button
                      onClick={onClearAll}
                      className="ml-auto text-xs font-semibold text-slate-400 hover:text-rose-600 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar seleção
                    </button>
                  )}
                </div>

                {/* Quick Add Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">
                    Atalhos da busca:
                  </span>
                  <button
                    onClick={() => onAddAllFromSearch()}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-slate-500" />
                    <span>Todos ({filteredCount})</span>
                  </button>
                  <button
                    onClick={() => onAddAllFromSearch("Locação")}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition flex items-center gap-1 border border-blue-200/50"
                  >
                    <Key className="w-3 h-3" />
                    <span>Adicionar Locação</span>
                  </button>
                  <button
                    onClick={() => onAddAllFromSearch("Venda")}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition flex items-center gap-1 border border-rose-200/50"
                  >
                    <BadgeDollarSign className="w-3 h-3" />
                    <span>Adicionar Venda</span>
                  </button>
                </div>
              </div>

              {/* Selected List Controls */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Exibindo {displayedProperties.length} de {selectedProperties.length} imóveis selecionados
                </h3>
              </div>

              {/* Selected Items Cards */}
              {selectedProperties.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-3">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">
                      Sua seleção está vazia
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Selecione imóveis no painel para montar sua apresentação em PDF, WhatsApp ou online.
                    </p>
                  </div>
                  {filteredCount > 0 && (
                    <button
                      onClick={() => onAddAllFromSearch()}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Incluir os {filteredCount} imóveis da busca
                    </button>
                  )}
                </div>
              ) : displayedProperties.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">
                    Nenhum imóvel corresponde ao filtro "{filterModalidade}".
                  </p>
                  <button
                    onClick={() => setFilterModalidade("all")}
                    className="text-xs text-rose-600 font-semibold underline"
                  >
                    Mostrar todos os {selectedProperties.length} imóveis selecionados
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedProperties.map((property, idx) => {
                    const isRent = property.modalidade === "Locação";
                    return (
                      <div
                        key={property.id}
                        className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <img
                            src={property.primaryImage}
                            alt={property.title}
                            className="w-20 h-16 rounded-lg object-cover shrink-0 bg-slate-100"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isRent
                                    ? "bg-blue-600 text-white"
                                    : "bg-rose-600 text-white"
                                }`}
                              >
                                {isRent ? <Key className="w-3 h-3" /> : <BadgeDollarSign className="w-3 h-3" />}
                                <span>{property.modalidade}</span>
                              </span>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {property.id}
                              </span>
                              <span className="text-[11px] text-rose-600 font-semibold">
                                {property.location.neighborhood} ({property.location.zone})
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                              {property.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="font-bold text-slate-900">
                                {formatCurrency(property.price)}
                                {isRent && <span className="font-normal text-slate-500 ml-0.5">/mês</span>}
                              </span>
                              <span>•</span>
                              <span>{property.livingArea || property.lotArea} m²</span>
                              <span>•</span>
                              <span>{property.bedrooms} qts</span>
                              <span>•</span>
                              <span>{property.garage} vagas</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => onSelectPropertyToView(property)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Ficha</span>
                          </button>

                          <button
                            onClick={() => onRemoveProperty(property.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remover da seleção"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Download Action + Progress */}
              {displayedProperties.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  {pdfGenerating && pdfProgress ? (
                    <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                          <span className="text-sm font-bold">
                            Gerando PDF ({pdfProgress.currentPage} de {pdfProgress.totalPages} páginas)
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {Math.round((pdfProgress.currentPage / pdfProgress.totalPages) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-600 transition-all duration-300"
                          style={{
                            width: `${(pdfProgress.currentPage / pdfProgress.totalPages) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">{pdfProgress.status}</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 font-medium">
                        {displayedProperties.length} {displayedProperties.length === 1 ? "imóvel pronto" : "imóveis prontos"} para a apresentação.
                      </span>
                      <button
                        onClick={handleDownloadDirectPDF}
                        className="px-5 sm:px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold transition flex items-center gap-2 shadow-md shadow-rose-600/20 active:scale-[0.99]"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Baixar Apresentação em PDF</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW: INTERACTIVE WEB LOOKBOOK */}
          {viewMode === "preview_web" && (
            <div className="p-5 sm:p-8 max-w-5xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200">
                  Prévia Online
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                  {catalogTitle}
                </h2>
                {clientName && (
                  <p className="text-sm font-semibold text-slate-600">
                    Apresentação preparada para {clientName}
                  </p>
                )}
                <p className="text-xs text-slate-500 max-w-xl mx-auto">
                  {customMessage}
                </p>
              </div>

              {/* Grid of properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedProperties.map((prop) => {
                  const isRent = prop.modalidade === "Locação";
                  return (
                    <div
                      key={prop.id}
                      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-16/10 bg-slate-100">
                          <img
                            src={prop.primaryImage}
                            alt={prop.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 ${
                                isRent ? "bg-blue-600" : "bg-rose-600"
                              }`}
                            >
                              {isRent ? <Key className="w-3 h-3" /> : <BadgeDollarSign className="w-3 h-3" />}
                              <span>{prop.modalidade}</span>
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/90 text-white">
                              {prop.propertyCategory}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                            <span className="font-bold drop-shadow-md">
                              {prop.location.neighborhood} ({prop.location.zone})
                            </span>
                            <span className="font-mono bg-black/60 px-2 py-0.5 rounded-md text-[10px] backdrop-blur-xs">
                              {prop.id}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xl font-black text-slate-900 font-heading">
                              {formatCurrency(prop.price)}
                              {isRent && <span className="text-xs text-slate-500 font-normal ml-1">/mês</span>}
                            </span>
                            {prop.condoFee > 0 && (
                              <span className="text-[11px] text-slate-500">
                                Cond: {formatCurrency(prop.condoFee)}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                            {prop.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span>{prop.livingArea || prop.lotArea} m²</span>
                            <span>•</span>
                            <span>{prop.bedrooms} qts ({prop.suites} suítes)</span>
                            <span>•</span>
                            <span>{prop.garage} vagas</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <button
                          onClick={() => onSelectPropertyToView(prop)}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Ficha Completa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: WHATSAPP GENERATOR */}
          {viewMode === "whatsapp" && (
            <div className="p-5 sm:p-8 max-w-3xl mx-auto space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-heading">
                        Mensagem Consolidada para WhatsApp
                      </h3>
                      <p className="text-xs text-slate-400">
                        {displayedProperties.length} imóveis prontos para envio direto ao cliente
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {whatsappMessage}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappMessage);
                      alert("Texto copiado com sucesso!");
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <span>Copiar Texto</span>
                  </button>

                  <a
                    href={createWhatsAppLink("", whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar no WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
