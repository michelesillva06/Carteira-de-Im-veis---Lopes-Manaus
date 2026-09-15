import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific database ID if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export interface FirebaseUserAccount {
  id: string;
  name: string;
  email: string;
  role: "admin" | "corretor";
  creci: string;
  phone: string;
  active: boolean;
  password?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

// Initial seed function for Firebase Firestore
export async function ensureDefaultFirebaseUsers() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      console.log("[Firebase] Seeding initial users into Firestore...");
      
      const defaultAdmin: FirebaseUserAccount = {
        id: "usr_admin",
        name: "Administrador Geral",
        email: "admin@lopesmanaus.com.br",
        role: "admin",
        creci: "687-J",
        phone: "(92) 99304-2722",
        active: true,
        password: "lopes@manaus2026",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      const defaultBroker: FirebaseUserAccount = {
        id: "usr_michele",
        name: "Michele Silva",
        email: "michele.sillva06@gmail.com",
        role: "corretor",
        creci: "5421-AM",
        phone: "(92) 99304-2722",
        active: true,
        password: "lopes@manaus2026",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", defaultAdmin.id), defaultAdmin);
      await setDoc(doc(db, "users", defaultBroker.id), defaultBroker);
      console.log("[Firebase] Default users seeded into Firestore successfully!");
    }
  } catch (err: any) {
    console.warn("[Firebase] User seed warning:", err.message);
  }
}

// Execute initial seed check
ensureDefaultFirebaseUsers().catch(console.warn);
