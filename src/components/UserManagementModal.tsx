import React, { useState, useEffect } from "react";
import { X, UserPlus, Users, Shield, Trash2, Power, CheckCircle, AlertCircle, Loader2, Database, KeyRound, Mail, Phone, User, Award } from "lucide-react";
import { UserAccount } from "../types";
import { fetchUsersFromFirebase, createUserInFirebase, toggleUserActiveInFirebase, deleteUserFromFirebase } from "../lib/userService";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New User Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "corretor">("corretor");
  const [creci, setCreci] = useState("");
  const [phone, setPhone] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const firebaseUsers = await fetchUsersFromFirebase();
      setUsers(firebaseUsers);
    } catch (err: any) {
      setError("Falha ao carregar lista de usuários do Firebase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setShowAddForm(false);
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Por favor, preencha Nome, E-mail e Senha.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const created = await createUserInFirebase({
        name,
        email,
        password,
        role,
        creci,
        phone,
      });

      setSuccessMsg(`Usuário "${created.name}" registrado no Firebase com sucesso!`);
      setName("");
      setEmail("");
      setPassword("");
      setCreci("");
      setPhone("");
      setShowAddForm(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Erro ao criar usuário no Firebase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    try {
      await toggleUserActiveInFirebase(user.id, !user.active);
      await loadUsers();
    } catch (err: any) {
      setError("Não foi possível alterar o status do usuário.");
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert("Você não pode remover seu próprio usuário.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}" do Firebase?`)) {
      return;
    }

    try {
      await deleteUserFromFirebase(userId);
      setSuccessMsg(`Usuário "${userName}" removido.`);
      await loadUsers();
    } catch (err: any) {
      setError("Falha ao excluir usuário do Firebase.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold">Gestão de Usuários e Corretores</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Firebase Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cadastre novos corretores e administradores com acesso ao catálogo de imóveis Lopes Manaus.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>Usuários Ativos no Banco de Dados:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-extrabold text-slate-900">
                {users.length}
              </span>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? "Cancelar Cadastro" : "+ Criar Novo Usuário"}</span>
            </button>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="mb-6 p-5 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-rose-600" />
                Novo Cadastro de Usuário (Firebase Firestore)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail de Acesso *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="corretor@lopesmanaus.com.br"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Senha de Acesso *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha..."
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="corretor">Corretor (Consultar Imóveis e Gerar PDFs)</option>
                    <option value="admin">Administrador Geral (Acesso Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número do CRECI
                  </label>
                  <div className="relative">
                    <Award className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={creci}
                      onChange={(e) => setCreci(e.target.value)}
                      placeholder="Ex: 5421-AM"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(92) 99999-9999"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando no Firebase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Salvar Usuário no Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              <span>Carregando usuários do Firebase Firestore...</span>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">CRECI</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.role === "admin" ? (
                          <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200 flex items-center gap-1 w-fit">
                            <Shield className="w-3 h-3 text-purple-600" /> Administrador
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200 w-fit inline-block">
                            Corretor
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.creci || "—"}</td>
                      <td className="py-3.5 px-4">
                        {u.active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title={u.active ? "Desativar usuário" : "Ativar usuário"}
                          >
                            <Power className={`w-4 h-4 ${u.active ? "text-emerald-600" : "text-slate-400"}`} />
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
