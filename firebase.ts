import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth/react-native";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "[GCP_API_KEY]",
  authDomain: "powerpay-17171.firebaseapp.com",
  projectId: "powerpay-17171",
  storageBucket: "powerpay-17171.firebasestorage.app",
  messagingSenderId: "1072477060016",
  appId: "1:1072477060016:web:77a8177060016",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔥 AsyncStorage v3 instance
const appStorage = createAsyncStorage("firebase_auth");

// 🔥 persistence Firebase RN v12 correct
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(appStorage),
});