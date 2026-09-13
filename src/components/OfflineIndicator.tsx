import React from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/usePWAInstall";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-6 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in duration-200 border border-amber-500">
      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Você ainda pode consultar os imóveis salvos e catálogos.</span>
    </div>
  );
};
