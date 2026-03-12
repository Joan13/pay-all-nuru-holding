import AppText from "@/src/components/app/Text";
import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import * as JetpackUI from "@expo/ui/jetpack-compose";
import * as SwiftUI from "@expo/ui/swift-ui";
import React, { useMemo } from "react";
import { ActivityIndicator, Platform, View, ViewStyle } from "react-native";
import { useAppSelector } from "../../store/app/hooks";

export interface IAppActivityIndicator {
  /**
   * Override the spinner color. Defaults to theme.primary.
   */
  color?: string;
  size?: number | "small" | "large";
  showLabel?: boolean;
  /**
   * Optional layout: when true, spinner and label are rendered in a row.
   */
  horizontal?: boolean;
  styles?: ViewStyle;
}

const AppActivityIndicator: React.FC<IAppActivityIndicator> = ({
  color,
  size = "small",
  styles,
  showLabel,
  horizontal,
}) => {
  const themeName = useAppSelector(state => state.persisted_app.theme);

  const themeColors = useMemo(
    () => (themeName === "light" ? LightTheme : DarkTheme),
    [themeName]
  );

  const spinnerColor = color ?? themeColors.primary;

  const JetpackActivityIndicator: any = (JetpackUI as any).ActivityIndicator;
  const SwiftHost: any = (SwiftUI as any).Host;
  const SwiftActivityIndicator: any = (SwiftUI as any).ActivityIndicator;

  // Android: use expo-ui Jetpack Compose when available
  if (Platform.OS === "android" && JetpackActivityIndicator) {
    return (
      <View
        style={[
          {
            minHeight: 40,
            paddingHorizontal: 8,
            backgroundColor: "transparent",
            flexDirection: horizontal ? "row" : "column",
            justifyContent: "center",
            alignItems: "center",
          },
          styles,
        ]}
      >
        <JetpackActivityIndicator color={spinnerColor} size={size} />
        {showLabel && (
          <AppText
            i18nKey="loading"
            size="small"
            styles={{
              marginTop: horizontal ? 0 : 8,
              marginLeft: horizontal ? 8 : 0,
              color: themeColors.gray,
            }}
          />
        )}
      </View>
    );
  }

  // iOS: use expo-ui SwiftUI when available
  if (Platform.OS === "ios" && SwiftHost && SwiftActivityIndicator) {
    return (
      <SwiftHost
        style={[
          {
            minHeight: 40,
            paddingHorizontal: 8,
            backgroundColor: "transparent",
            flexDirection: horizontal ? "row" : "column",
            justifyContent: "center",
            alignItems: "center",
          },
          styles,
        ]}
      >
        <SwiftActivityIndicator color={spinnerColor} size={size} />
        {showLabel && (
          <AppText
            i18nKey="loading"
            size="small"
            styles={{
              marginTop: horizontal ? 0 : 8,
              marginLeft: horizontal ? 8 : 0,
              color: themeColors.gray,
            }}
          />
        )}
      </SwiftHost>
    );
  }

  return (
    <View
      style={[
        {
          minHeight: 40,
          paddingHorizontal: 8,
          backgroundColor: "transparent",
          flexDirection: horizontal ? "row" : "column",
          justifyContent: "center",
          alignItems: "center",
        },
        styles,
      ]}
    >
      <ActivityIndicator color={spinnerColor} size={size} />
      {showLabel && (
        <AppText
          i18nKey="loading"
          size="small"
          styles={{
            marginTop: horizontal ? 0 : 8,
            marginLeft: horizontal ? 8 : 0,
            color: themeColors.gray,
          }}
        />
      )}
    </View>
  );
};

export default AppActivityIndicator;

