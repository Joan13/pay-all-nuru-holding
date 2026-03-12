import IconApp from '@/src/components/app/IconApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.gray,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          height: (Platform.OS === 'ios' ? 60 : 50) + insets.bottom + 10,
          paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 5 : 5) + 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('map.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconApp pack="FI" name="map" size={size} color={color} styles={{}} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('history.title'),
          tabBarIcon: ({ color, size }) => (
            <IconApp pack="FI" name="clock" size={size} color={color} styles={{}} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          headerTitle: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <IconApp pack="FI" name="settings" size={size} color={color} styles={{}} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('admin.title'),
          headerTitle: t('admin.title'),
          tabBarIcon: ({ color, size }) => (
            <IconApp pack="MC" name="view-dashboard-outline" size={size} color={color} styles={{}} />
          ),
          href: userData && userData?.is_admin === true ? '/admin' : null,
        }}
      />
    </Tabs>
  );
}

