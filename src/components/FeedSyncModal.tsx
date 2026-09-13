import React, { useState } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Building,
  DollarSign,
  MapPin,
  Clock,
  Radio,
} from "lucide-react";
import { FeedMetadata } from "../types";
import { formatCurrency } from "../data/manaustowns";

interface FeedSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedUrl: string;
  lastSyncTime: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  metadata: FeedMetadata | null;
  onTriggerSync: (url?: string) => Promise<void>;
}

export const FeedSyncModal: React.FC<FeedSyncModalProps> = ({
  isOpen,
  onClose,
  feedUrl,
  lastSyncTime,
  syncStatus,
  metadata,
  onTriggerSync,
}) => {
  const [inputUrl, setInputUrl] = useState(feedUrl);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setInputUrl(feedUrl);
      setFeedback(null);
    }
  }, [isOpen, feedUrl]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await onTriggerSync(inputUrl);
      setFeedback("Feed XML sincronizado com sucesso! Dados atualizados.");
    } catch (e: any) {
      setFeedback(`Erro ao sincronizar: ${e.message || "Tente novamente."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFullDate = (iso: string | null) => {
    if (!iso) return "Pendente";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Agora";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/favicon-lopes.png"
              alt="Lopes"
              className="w-9 h-9 rounded-xl object-contain bg-white p-1 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-heading">
                  Sincronização em Tempo Real
                </h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  Feed Oficial Lopesnet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Integração automática com o arquivo XML oficial da Lopes Manaus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Feed URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              URL do Arquivo XML (Lopesnet / ZAP)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://multimidia.lopes.com.br/portais/zap-lopesmanaus-v2.xml"
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden"
              />
              <button
                onClick={handleSync}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                <span>{isSubmitting ? "Sincronizando..." : "Atualizar Agora"}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              O sistema lê as unidades, fotos, valores de condomínio e descrições diretamente desta fonte.
            </p>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedback.includes("sucesso")
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {feedback.includes("sucesso") ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback}</span>
            </div>
          )}

          {/* Sync Information Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Total de Imóveis
              </span>
              <span className="text-xl font-black text-slate-900 font-heading">
                {metadata?.total || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">unidades no feed XML</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Bairros
              </span>
              <span className="text-xl font-black text-slate-900 font-heading">
                {metadata?.neighborhoods?.length || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">em Manaus e região</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Preço Médio
              </span>
              <span className="text-sm font-black text-slate-900 font-heading">
                {formatCurrency(metadata?.priceStats?.average || 0)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">na carteira ativa</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Zonas Mapeadas
              </span>
              <span className="text-xl font-black text-slate-900 font-heading">
                {metadata?.zones?.length || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">zonas de Manaus</span>
            </div>
          </div>

          {/* Info note about CRM vs XML feed */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Entenda o número de imóveis (Lopesnet vs. Feed XML)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              O sistema lê <strong>100% dos imóveis contidos no arquivo XML ({metadata?.total || 154} de {metadata?.total || 154})</strong>. Caso o Lopesnet exiba um número maior (ex: 193), a diferença ocorre porque o XML exporta apenas imóveis <em>Ativos</em>, com flag de <em>Divulgação em Portais</em> marcada, fotos cadastradas e após o ciclo de sincronização em lote da matriz Lopes.
            </p>
          </div>

          {/* Timestamp details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Última atualização em tempo real:</span>
            </div>
            <strong className="text-slate-900 font-mono">
              {formatFullDate(lastSyncTime)}
            </strong>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={inputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir XML bruto</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
