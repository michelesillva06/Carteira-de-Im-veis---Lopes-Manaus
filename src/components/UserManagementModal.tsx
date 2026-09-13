import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Shield,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Key,
  Phone,
  Mail,
  FileSpreadsheet,
  History,
} from "lucide-react";
import { UserAccount, AuditLog } from "../types";
import { fetchJson } from "../utils/apiClient";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "gerente" | "corretor">("corretor");
  const [newCreci, setNewCreci] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Audit filter
  const [logFilter, setLogFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, logsData] = await Promise.all([
        fetchJson<{ users: UserAccount[] }>("/api/users"),
        fetchJson<{ logs: AuditLog[] }>("/api/audit-logs"),
      ]);

      setUsers(usersData.users || []);
      setAuditLogs(logsData.logs || []);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar dados do banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      setError("Nome, e-mail e senha são obrigatórios.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          creci: newCreci,
          phone: newPhone,
          actor: currentUser
            ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
            : { id: "usr_admin", name: "Admin", role: "admin" },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erro ao criar usuário.");
      }

      setSuccessMsg(`Usuário ${data.user.name} cadastrado com sucesso no banco de dados!`);
      setShowAddForm(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewCreci("");
      setNewPhone("");
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar novo usuário.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleUserStatus = async (user: UserAccount) => {
    if (user.id === "usr_admin") {
      alert("O administrador principal não pode ser desativado.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: !user.active,
          actor: currentUser
            ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
            : undefined,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.id === "usr_admin") {
      alert("O administrador principal não pode ser excluído.");
      return;
    }

    if (!confirm(`Deseja realmente remover o usuário "${user.name}" da base de dados?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: currentUser
            ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
            : undefined,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Usuário ${user.name} removido com sucesso.`);
        loadData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!logFilter.trim()) return true;
    const term = logFilter.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold">Gestão de Usuários & Base de Dados</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Lopes Manaus
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cadastre corretores, gerentes e audite em tempo real todas as alterações na base real.
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === "users"
                ? "border-rose-600 text-rose-600 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários Cadastrados ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === "audit"
                ? "border-rose-600 text-rose-600 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Alterações ({auditLogs.length})</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: USERS LIST & CREATION */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Equipe e Corretores Autorizados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Os dados são salvos de forma permanente na base de dados real do servidor.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{showAddForm ? "Cancelar Cadastro" : "+ Criar Novo Usuário"}</span>
                </button>
              </div>

              {/* Form to Add User */}
              {showAddForm && (
                <form
                  onSubmit={handleCreateUser}
                  className="bg-slate-50 border border-rose-200 p-4 sm:p-5 rounded-2xl space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Novo Usuário no Banco de Dados</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        required
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        E-mail de Acesso *
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="exemplo@lopesmanaus.com.br"
                        required
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Senha Inicial *
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        required
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Cargo / Perfil
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="corretor">Corretor(a) Especialista</option>
                        <option value="gerente">Gerente de Vendas</option>
                        <option value="admin">Administrador Geral</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        CRECI (Opcional)
                      </label>
                      <input
                        type="text"
                        value={newCreci}
                        onChange={(e) => setNewCreci(e.target.value)}
                        placeholder="Ex: 5421-AM"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="Ex: (92) 99304-2722"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      {creating ? "Salvando no Banco..." : "Gravar Usuário na Base"}
                    </button>
                  </div>
                </form>
              )}

              {/* Users Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Nome / Usuário</th>
                      <th className="p-3">E-mail</th>
                      <th className="p-3">Perfil</th>
                      <th className="p-3">CRECI / Contato</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{u.name}</div>
                              <div className="text-[10px] text-slate-400">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{u.email}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : u.role === "gerente"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {u.role === "admin"
                              ? "Administrador"
                              : u.role === "gerente"
                              ? "Gerente"
                              : "Corretor"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          <div>{u.creci ? `CRECI: ${u.creci}` : "—"}</div>
                          <div className="text-[10px] text-slate-400">{u.phone || "Sem fone"}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              u.active ? "text-emerald-600" : "text-slate-400"
                            }`}
                          >
                            {u.active ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ativo</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Inativo</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.id !== "usr_admin" && (
                              <>
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className="px-2 py-1 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                  title={u.active ? "Desativar conta" : "Ativar conta"}
                                >
                                  {u.active ? "Desativar" : "Ativar"}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                  title="Remover usuário"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {u.id === "usr_admin" && (
                              <span className="text-[10px] text-slate-400 italic">Admin Principal</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Registro de Auditoria Permanente
                  </h3>
                  <p className="text-xs text-slate-500">
                    Toda alteração de usuários, downloads e acessos fica gravada no arquivo de banco de dados.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Filtrar por usuário ou ação..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {filteredLogs.map((log) => {
                  const dateFormatted = new Date(log.timestamp).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-slate-300 transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{log.userName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-slate-600">{log.details}</p>
                      </div>

                      <div className="text-right shrink-0 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{dateFormatted}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
