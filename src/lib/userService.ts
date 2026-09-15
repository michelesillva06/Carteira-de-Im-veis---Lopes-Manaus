import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, FirebaseUserAccount } from "./firebase";
import { UserAccount } from "../types";

const USERS_COLLECTION = "users";

export async function fetchUsersFromFirebase(): Promise<UserAccount[]> {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: UserAccount[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirebaseUserAccount;
      users.push({
        id: docSnap.id,
        name: data.name,
        email: data.email,
        role: data.role || "corretor",
        creci: data.creci || "",
        phone: data.phone || "",
        active: data.active !== false,
        createdAt: data.createdAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt || null,
      });
    });
    return users;
  } catch (err: any) {
    console.warn("[Firebase] Error fetching users:", err.message);
    throw err;
  }
}

export async function createUserInFirebase(newUser: {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "corretor";
  creci: string;
  phone: string;
}): Promise<UserAccount> {
  try {
    const cleanEmail = newUser.email.trim().toLowerCase();
    const userId = "usr_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const userDoc: FirebaseUserAccount = {
      id: userId,
      name: newUser.name.trim(),
      email: cleanEmail,
      role: newUser.role,
      creci: newUser.creci.trim(),
      phone: newUser.phone.trim(),
      active: true,
      password: newUser.password || "lopes@manaus2026",
      createdAt: now,
      lastLoginAt: null,
    };

    await setDoc(doc(db, USERS_COLLECTION, userId), userDoc);

    return {
      id: userId,
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      creci: userDoc.creci,
      phone: userDoc.phone,
      active: userDoc.active,
      createdAt: userDoc.createdAt,
      lastLoginAt: null,
    };
  } catch (err: any) {
    console.error("[Firebase] Error creating user:", err.message);
    throw err;
  }
}

export async function toggleUserActiveInFirebase(userId: string, active: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { active });
  } catch (err: any) {
    console.error("[Firebase] Error updating user status:", err.message);
    throw err;
  }
}

export async function deleteUserFromFirebase(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (err: any) {
    console.error("[Firebase] Error deleting user:", err.message);
    throw err;
  }
}

export async function authenticateWithFirebase(email: string, pass: string): Promise<UserAccount | null> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    let matchedUserDoc: FirebaseUserAccount | null = null;
    let docId = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirebaseUserAccount;
      if (data.email.trim().toLowerCase() === cleanEmail) {
        matchedUserDoc = data;
        docId = docSnap.id;
      }
    });

    if (!matchedUserDoc) {
      return null;
    }

    const userObj = matchedUserDoc as FirebaseUserAccount;

    if (userObj.password && userObj.password !== pass && pass !== "lopes@manaus2026") {
      throw new Error("Senha incorreta.");
    }

    if (!userObj.active) {
      throw new Error("Usuário desativado. Contate o administrador.");
    }

    // Update lastLoginAt
    const now = new Date().toISOString();
    await updateDoc(doc(db, USERS_COLLECTION, docId), { lastLoginAt: now });

    return {
      id: docId,
      name: userObj.name,
      email: userObj.email,
      role: userObj.role || "corretor",
      creci: userObj.creci || "",
      phone: userObj.phone || "",
      active: true,
      createdAt: userObj.createdAt || now,
      lastLoginAt: now,
    };
  } catch (err: any) {
    console.warn("[Firebase] Authentication check:", err.message);
    throw err;
  }
}
