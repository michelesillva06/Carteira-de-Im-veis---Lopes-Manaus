import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "gerente" | "corretor";
  creci: string;
  phone: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  ip: string;
}

export interface SystemSettingsRecord {
  agencyName: string;
  creciPJ: string;
  officialPhone: string;
  officialEmail: string;
  feedUrl: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  auditLogs: AuditLogRecord[];
  settings: SystemSettingsRecord;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "lopes_system_db.json");

// Password hashing with salt
export function hashPassword(password: string): string {
  const salt = "lopes_manaus_salt_2026";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

function getInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: "usr_admin",
        name: "Administrador Geral",
        email: "admin@lopesmanaus.com.br",
        passwordHash: hashPassword("lopes@manaus2026"),
        role: "admin",
        creci: "687-J",
        phone: "(92) 99304-2722",
        active: true,
        createdAt: now,
        lastLoginAt: null,
      },
      {
        id: "usr_michele",
        name: "Michele Silva",
        email: "michele.sillva06@gmail.com",
        passwordHash: hashPassword("lopes@manaus2026"),
        role: "corretor",
        creci: "5421-AM",
        phone: "(92) 99304-2722",
        active: true,
        createdAt: now,
        lastLoginAt: null,
      },
    ],
    auditLogs: [
      {
        id: "log_init",
        timestamp: now,
        userId: "usr_system",
        userName: "Sistema Lopes",
        userRole: "admin",
        action: "SISTEMA_INICIALIZADO",
        details: "Base de dados persistente real inicializada com sucesso para a Lopes Manaus.",
        ip: "127.0.0.1",
      },
    ],
    settings: {
      agencyName: "Lopes Manaus Imóveis",
      creciPJ: "687-J",
      officialPhone: "92993042722",
      officialEmail: "contato@lopesmanaus.com.br",
      feedUrl: "https://multimidia.lopes.com.br/portais/zap-lopesmanaus-v2.xml",
      updatedAt: now,
    },
  };
}

class SystemDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("[Database] Error reading db file, regenerating defaults:", err);
    }

    const initial = getInitialDatabase();
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(dataToSave: DatabaseSchema = this.data) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Atomic write using temporary file
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), "utf-8");
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error("[Database] Fatal error saving to disk:", err);
    }
  }

  // --- Users Operations ---
  public getUsers(): Omit<UserRecord, "passwordHash">[] {
    return this.data.users.map(({ passwordHash, ...user }) => user);
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(
    userData: {
      name: string;
      email: string;
      password: string;
      role: "admin" | "gerente" | "corretor";
      creci?: string;
      phone?: string;
    },
    actor: { id: string; name: string; role: string },
    ip: string = "127.0.0.1"
  ): Omit<UserRecord, "passwordHash"> {
    const existing = this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error(`Já existe um usuário cadastrado com o e-mail: ${userData.email}`);
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const newUser: UserRecord = {
      id,
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      passwordHash: hashPassword(userData.password),
      role: userData.role || "corretor",
      creci: userData.creci?.trim() || "",
      phone: userData.phone?.trim() || "",
      active: true,
      createdAt: now,
      lastLoginAt: null,
    };

    this.data.users.push(newUser);
    this.saveToDisk();

    this.logAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "CRIOU_USUARIO",
      details: `Cadastrou o usuário ${newUser.name} (${newUser.email}) com cargo ${newUser.role}.`,
      ip,
    });

    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  public updateUser(
    id: string,
    updates: Partial<{
      name: string;
      email: string;
      password?: string;
      role: "admin" | "gerente" | "corretor";
      creci?: string;
      phone?: string;
      active?: boolean;
    }>,
    actor: { id: string; name: string; role: string },
    ip: string = "127.0.0.1"
  ): Omit<UserRecord, "passwordHash"> {
    const userIndex = this.data.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error("Usuário não encontrado.");
    }

    const current = this.data.users[userIndex];

    if (updates.email && updates.email.toLowerCase() !== current.email.toLowerCase()) {
      const emailTaken = this.data.users.some(
        (u) => u.id !== id && u.email.toLowerCase() === updates.email!.toLowerCase()
      );
      if (emailTaken) {
        throw new Error("Este e-mail já está sendo utilizado por outro usuário.");
      }
      current.email = updates.email.toLowerCase().trim();
    }

    if (updates.name) current.name = updates.name.trim();
    if (updates.role) current.role = updates.role;
    if (updates.creci !== undefined) current.creci = updates.creci.trim();
    if (updates.phone !== undefined) current.phone = updates.phone.trim();
    if (updates.active !== undefined) current.active = updates.active;
    if (updates.password && updates.password.trim().length >= 4) {
      current.passwordHash = hashPassword(updates.password.trim());
    }

    this.data.users[userIndex] = current;
    this.saveToDisk();

    this.logAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "EDITOU_USUARIO",
      details: `Atualizou os dados do usuário ${current.name} (${current.email}).`,
      ip,
    });

    const { passwordHash, ...safeUser } = current;
    return safeUser;
  }

  public deleteUser(
    id: string,
    actor: { id: string; name: string; role: string },
    ip: string = "127.0.0.1"
  ): boolean {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return false;

    if (user.id === "usr_admin") {
      throw new Error("O administrador principal do sistema não pode ser excluído.");
    }

    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.saveToDisk();

    this.logAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "EXCLUIU_USUARIO",
      details: `Excluiu o usuário ${user.name} (${user.email}).`,
      ip,
    });

    return true;
  }

  public recordLogin(id: string, ip: string = "127.0.0.1") {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return;
    const now = new Date().toISOString();
    user.lastLoginAt = now;
    this.saveToDisk();

    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "LOGIN_EFETUADO",
      details: `Usuário ${user.name} acessou o sistema com sucesso.`,
      ip,
    });
  }

  // --- Audit Log Operations ---
  public logAudit(log: Omit<AuditLogRecord, "id" | "timestamp">) {
    const newRecord: AuditLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(newRecord);
    // Keep last 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.saveToDisk();
  }

  public getAuditLogs(limit: number = 100): AuditLogRecord[] {
    return this.data.auditLogs.slice(0, limit);
  }

  // --- Settings ---
  public getSettings(): SystemSettingsRecord {
    return this.data.settings;
  }

  public updateSettings(
    newSettings: Partial<SystemSettingsRecord>,
    actor: { id: string; name: string; role: string },
    ip: string = "127.0.0.1"
  ) {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    this.saveToDisk();

    this.logAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "ALTEROU_CONFIGURACOES",
      details: `Atualizou configurações gerais do sistema Lopes Manaus.`,
      ip,
    });
  }
}

export const db = new SystemDatabase();
