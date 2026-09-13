import React, { useState } from "react";
import { X, Lock, Mail, UserCheck, Shield, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { UserAccount } from "../types";
import { fetchJson } from "../utils/apiClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  isMandatory?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isMandatory = false,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<{ success: boolean; user: UserAccount; message?: string }>(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );

      if (!data.success || !data.user) {
        throw new Error(data.message || "E-mail ou senha incorretos.");
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha na autenticação. Verifique os dados inseridos.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header background with Lopes branding */}
        <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-rose-800 p-6 text-white relative">
          {!isMandatory && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-rose-100 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <img
              src="/favicon-lopes.png"
              alt="Lopes"
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">LOPES MANAUS</h2>
              <p className="text-xs text-rose-100 font-medium">Portal Seguro & Base de Dados</p>
            </div>
          </div>
          <p className="text-xs text-rose-100/90 mt-2">
            Acesse sua conta para emitir catálogos, gerenciar usuários e visualizar o histórico de alterações do sistema.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@lopesmanaus.com.br"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando na Base de Dados...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access for immediate convenience */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Acesso Rápido para Demonstração:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickLogin("michele.sillva06@gmail.com", "lopes@manaus2026")}
                className="p-2.5 text-left border border-slate-200 rounded-xl hover:bg-rose-50/50 hover:border-rose-200 transition text-xs group"
              >
                <div className="font-bold text-slate-800 group-hover:text-rose-700 truncate">
                  Michele Silva
                </div>
                <div className="text-[10px] text-slate-400">Corretora (CRECI 5421)</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickLogin("admin@lopesmanaus.com.br", "lopes@manaus2026")}
                className="p-2.5 text-left border border-slate-200 rounded-xl hover:bg-rose-50/50 hover:border-rose-200 transition text-xs group"
              >
                <div className="font-bold text-slate-800 group-hover:text-rose-700 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-rose-600" />
                  <span>Admin Geral</span>
                </div>
                <div className="text-[10px] text-slate-400">Acesso Total / Gestão</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
