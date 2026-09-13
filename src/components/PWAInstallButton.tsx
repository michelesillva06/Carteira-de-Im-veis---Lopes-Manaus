import React, { useState } from "react";
import { Download, Smartphone, X, Check, Share, PlusSquare } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "header" | "floating" | "banner";
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = "header",
  className = "",
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed, don't show prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If neither installable directly nor iOS, still provide an informative install button on mobile/desktop browsers
  const isDirectPrompt = isInstallable;

  return (
    <>
      {variant === "header" && (
        <button
          onClick={handleInstallClick}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs bg-rose-600 hover:bg-rose-700 text-white ${className}`}
          title="Instalar aplicativo Lopes Manaus no seu celular ou computador"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === "banner" && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 text-white p-3 sm:p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/favicon-lopes.png"
              alt="Lopes Manaus"
              className="w-10 h-10 rounded-xl bg-white p-1 shadow-xs shrink-0 object-contain"
            />
            <div>
              <h4 className="text-sm font-bold text-white font-heading leading-tight">
                Instale o App Lopes Manaus
              </h4>
              <p className="text-xs text-rose-100">
                Acesso rápido na tela inicial do seu celular, busca offline e envio ágil para clientes.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="px-4 py-2 rounded-xl bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5 shadow-xs ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalling ? "Instalando..." : "Instalar no Celular"}</span>
          </button>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src="/favicon-lopes.png"
                  alt="Lopes Manaus"
                  className="w-8 h-8 rounded-lg shadow-2xs"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Instalar no iPhone / iPad
                  </h3>
                  <p className="text-[11px] text-slate-500">Lopes Manaus PWA</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <p>
                  Toque no botão de <strong>Compartilhar</strong> (ícone <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />) na barra inferior do Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <p>
                  Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (ícone <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />).
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <p>
                  Toque em <strong>"Adicionar"</strong> no canto superior direito. O ícone oficial da Lopes ficará na tela inicial como um app nativo!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
