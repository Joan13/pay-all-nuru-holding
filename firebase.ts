import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "[GCP_API_KEY]",
    authDomain: "powerpay-17171.firebaseapp.com",
    projectId: "powerpay-17171",
    storageBucket: "powerpay-17171.firebasestorage.app",
    messagingSenderId: "1072477060016",
    appId: "1:1072477060016:web:77a8177060016",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);