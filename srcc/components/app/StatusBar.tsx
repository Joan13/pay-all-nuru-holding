import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import React from 'react';
import { StatusBar } from 'react-native';

export default function StatusBarApp() {
    const theme = useAppSelector(state => state.persisted_app.theme);
    return (
        <StatusBar
            backgroundColor={theme === "light" ? LightTheme.status_bar : DarkTheme.status_bar}
            barStyle={theme === "light" ? "dark-content" : "light-content"} />
    )
}