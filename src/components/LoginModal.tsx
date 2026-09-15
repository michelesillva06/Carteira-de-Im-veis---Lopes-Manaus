import React, { useState } from "react";
import { Lock, Mail, UserCheck, Shield, AlertCircle, Sparkles, Building2 } from "lucide-react";
import { UserAccount } from "../types";
import { authenticateWithFirebase } from "../lib/userService";
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
  isMandatory = true,
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

  const performLogin = async (loginEmail: string, loginPass: string) => {
    if (!loginEmail || !loginPass) {
      setError("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    setError(null);
    setEmail(loginEmail);
    setPassword(loginPass);

    try {
      // 1. First authenticate with Firebase Firestore database
      const firebaseUser = await authenticateWithFirebase(loginEmail, loginPass);
      if (firebaseUser) {
        onLoginSuccess(firebaseUser);
        onClose();
        return;
      }

      // 2. Server API fallback check
      const data = await fetchJson<{ success: boolean; user: UserAccount; message?: string }>(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail.trim(), password: loginPass }),
        }
      );

      if (data && data.success && data.user) {
        onLoginSuccess(data.user);
        onClose();
        return;
      }

      throw new Error(data?.message || "E-mail ou senha incorretos.");
    } catch (err: any) {
      // Local demo fallback if network issues
      const cleanEmail = loginEmail.trim().toLowerCase();
      if (loginPass === "lopes@manaus2026") {
        if (cleanEmail === "michele.sillva06@gmail.com") {
          const fallbackUser: UserAccount = {
            id: "usr_michele",
            name: "Michele Silva",
            email: "michele.sillva06@gmail.com",
            role: "corretor",
            creci: "5421-AM",
            phone: "(92) 99304-2722",
            active: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          onLoginSuccess(fallbackUser);
          onClose();
          return;
        } else if (cleanEmail === "admin@lopesmanaus.com.br") {
          const fallbackUser: UserAccount = {
            id: "usr_admin",
            name: "Administrador Geral",
            email: "admin@lopesmanaus.com.br",
            role: "admin",
            creci: "687-J",
            phone: "(92) 99304-2722",
            active: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          onLoginSuccess(fallbackUser);
          onClose();
          return;
        }
      }

      setError(err.message || "Falha na autenticação. Verifique os dados inseridos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header background with Lopes branding */}
        <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-rose-800 p-6 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">LOPES MANAUS</h2>
              <p className="text-xs text-rose-100 font-medium">Portal Imobiliário & Base Firebase</p>
            </div>
          </div>
          <p className="text-xs text-rose-100/95 mt-2 leading-relaxed">
            Identifique-se para acessar o acervo de imóveis, consultar ofertas e gerar apresentações em PDF.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail de Acesso
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
              className="w-full mt-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando no Firebase...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Acessar Portal Imobiliário</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Access */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Entrar Diretamente com 1-Clique:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => performLogin("michele.sillva06@gmail.com", "lopes@manaus2026")}
                className="p-3 text-left border border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 active:bg-rose-100 rounded-xl transition text-xs group cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
              >
                <div className="font-extrabold text-slate-900 group-hover:text-rose-700 truncate flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Michele Silva</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Corretora (CRECI 5421)</div>
                <div className="text-[9px] text-rose-700 font-bold mt-1">Clique para Entrar ⚡</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => performLogin("admin@lopesmanaus.com.br", "lopes@manaus2026")}
                className="p-3 text-left border border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 active:bg-rose-100 rounded-xl transition text-xs group cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
              >
                <div className="font-extrabold text-slate-900 group-hover:text-rose-700 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Admin Geral</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Acesso Total / Gestão</div>
                <div className="text-[9px] text-rose-700 font-bold mt-1">Clique para Entrar ⚡</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
