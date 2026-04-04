import StatusBarApp from "@/src/components/app/StatusBar";
import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import LanguageInitializer from "@/src/lang/LanguageInitializer";
import { useAppSelector } from "@/src/store/app/hooks";
import store, { persistor } from "@/src/store/app/store";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import RNBootSplash from "react-native-bootsplash";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/es/integration/react";
// Initialize i18next before app renders
import "@/src/lang/i18nextConfig";
// import { TouchableOpacity } from "react-native";
// TouchableOpacity.defaultProps = { activeOpacity: 0.8 };

function AppNavigation() {
  const theme = useAppSelector(state => state.persisted_app.theme);
  const themeColors = theme === "light" ? LightTheme : DarkTheme;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          color: themeColors.text,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="Signin" options={{ headerShown: false }} />
      <Stack.Screen name="PowerPay" options={{ headerShown: false }} />
      <Stack.Screen name="History" options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="Map" options={{ headerShown: false }} />
      <Stack.Screen
        name="ConfirmRide"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Rides"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Ride"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    RNBootSplash.hide({ fade: true });
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LanguageInitializer />
        <StatusBarApp />
        <AppNavigation />
      </PersistGate>
    </Provider>
  );
}
