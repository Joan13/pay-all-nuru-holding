import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import { Switch as JetpackSwitch } from "@expo/ui/jetpack-compose";
import { Host as SwiftHost, Switch as SwiftSwitch } from "@expo/ui/swift-ui";
import React, { useMemo } from "react";
import { Platform, Switch, View, ViewStyle } from "react-native";
import { useAppSelector } from "../../store/app/hooks";

export interface ISwitchAppProps {
  value: boolean;
  /**
   * Optional: override the primary/on color of the switch.
   * Defaults to theme.primary.
   */
  color?: string;
  small?: boolean;
  disabled?: boolean;
  styles?: ViewStyle;
  onPress?: (nextValue: boolean) => void;
}

const SwitchApp: React.FC<ISwitchAppProps> = ({
  value,
  color,
  small,
  disabled,
  styles,
  onPress,
}) => {
  const themeName = useAppSelector(state => state.persisted_app.theme);

  const themeColors = useMemo(
    () => (themeName === "light" ? LightTheme : DarkTheme),
    [themeName]
  );

  const primaryColor = color ?? themeColors.primary;

  // Use expo-ui Jetpack Compose on Android
  if (Platform.OS === "android") {
    return (
      <JetpackSwitch
        value={value}
        onValueChange={(next: boolean) => {
          if (disabled) return;
          onPress?.(next);
        }}
      />
    );
  }

  // Use expo-ui SwiftUI on iOS
  if (Platform.OS === "ios") {
    return (
      <SwiftHost style={styles}>
        <SwiftSwitch
          value={value}
          onValueChange={(next: boolean) => {
            if (disabled) return;
            onPress?.(next);
          }}
        />
      </SwiftHost>
    );
  }

  // Default React Native switch (both platforms)
  return (
    <View style={styles}>
      <Switch
        value={value}
        onValueChange={next => {
          if (disabled) return;
          onPress?.(next);
        }}
        disabled={disabled}
        trackColor={{
          true: primaryColor,
          false: themeColors.gray,
        }}
        thumbColor={themeColors.background}
        style={{
          transform: [{ scale: small ? 0.8 : 1 }],
        }}
      />
    </View>
  );
};

export default SwitchApp;


