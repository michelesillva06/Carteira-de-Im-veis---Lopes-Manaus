import React from "react";
import { RefreshCw, UserCheck, BookOpen, Shield, LogIn, LogOut } from "lucide-react";
import { BrokerProfile, UserAccount } from "../types";
import { PWAInstallButton } from "./PWAInstallButton";

interface HeaderProps {
  totalCount: number;
  lastSyncTime: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  selectedCount: number;
  brokerProfile: BrokerProfile;
  currentUser: UserAccount | null;
  onOpenSyncModal: () => void;
  onOpenBrokerModal: () => void;
  onOpenCatalogModal: () => void;
  onOpenLoginModal: () => void;
  onOpenUserManagementModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  lastSyncTime,
  syncStatus,
  selectedCount,
  brokerProfile,
  currentUser,
  onOpenSyncModal,
  onOpenBrokerModal,
  onOpenCatalogModal,
  onOpenLoginModal,
  onOpenUserManagementModal,
  onLogout,
}) => {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "Hoje";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recente";
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Lopes Manaus Logo & Clean Title */}
          <div className="flex items-center gap-3">
            <img
              src="/favicon-lopes.png"
              alt="Lopes Consultoria de Imóveis"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900 font-heading">
                  LOPES <span className="text-rose-600">MANAUS</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden xs:block">
                Carteira Imobiliária
              </p>
            </div>
          </div>

          {/* Center / Feed Live Status */}
          <div
            className="hidden md:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
            onClick={onOpenSyncModal}
            title="Clique para gerenciar ou sincronizar o feed XML da Lopes"
          >
            <span className="relative flex h-2 w-2">
              {syncStatus === "syncing" ? (
                <span className="animate-spin rounded-full h-2 w-2 border-2 border-rose-600 border-t-transparent" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </>
              )}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {syncStatus === "syncing" ? "Sincronizando..." : `${totalCount} Imóveis`}
            </span>
            <span className="text-slate-300 text-xs">•</span>
            <span className="text-xs text-slate-500">
              {lastSyncTime ? `Atualizado às ${formatTime(lastSyncTime)}` : "Online"}
            </span>
            <RefreshCw
              className={`w-3 h-3 text-slate-400 ml-0.5 ${
                syncStatus === "syncing" ? "animate-spin text-rose-600" : ""
              }`}
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* PWA Mobile Install Button in Header */}
            <PWAInstallButton variant="header" />

            {/* User Account / Access Button */}
            {currentUser ? (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                <button
                  onClick={onOpenUserManagementModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:text-rose-600 hover:bg-white rounded-lg transition"
                  title="Gestão de Usuários"
                >
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden xl:inline">{currentUser.name.split(" ")[0]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-mono">
                    {currentUser.role}
                  </span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs hover:border-slate-300"
                title="Acesso de Usuário"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Acesso</span>
              </button>
            )}

            {/* Broker profile button */}
            <button
              onClick={onOpenBrokerModal}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs hover:border-slate-300"
              title="Personalizar dados do Corretor / CRECI"
            >
              {brokerProfile.avatarUrl ? (
                <img
                  src={brokerProfile.avatarUrl}
                  alt={brokerProfile.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-600" />
              )}
              <div className="hidden lg:flex flex-col text-left leading-none">
                <span className="font-semibold text-slate-800 text-[12px] truncate max-w-[110px]">
                  {brokerProfile.name.split(" ")[0] || "Corretor"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {brokerProfile.creci ? `CRECI ${brokerProfile.creci}` : "Identificação"}
                </span>
              </div>
            </button>

            {/* Catalog Cart / Generator Button */}
            <button
              onClick={onOpenCatalogModal}
              className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-sm ${
                selectedCount > 0
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 ring-2 ring-rose-600/20"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden xs:inline">Gerar Apresentação</span>
              <span className="xs:hidden">Apresentação</span>
              {selectedCount > 0 ? (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold bg-white text-rose-600 rounded-full min-w-[20px]">
                  {selectedCount}
                </span>
              ) : (
                <span className="hidden sm:inline text-slate-400 text-xs font-normal">
                  (0)
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
