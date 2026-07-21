import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import { useAppSelector } from "@/src/store/app/hooks";
import React, { useMemo } from "react";
import { View, ViewProps } from "react-native";

export interface AppViewProps extends ViewProps {
  children: React.ReactNode;
  /**
   * Optional semantic background variant.
   * - default: themed background
   * - primary: uses theme.primary
   * - danger: uses theme.error
   */
  variant?: "default" | "primary" | "danger";
}

export const AppView: React.FC<AppViewProps> = ({
  children,
  style,
  variant = "default",
  ...rest
}) => {
  const themeName = useAppSelector(state => state.persisted_app.theme);

  const themeColors = useMemo(
    () => (themeName === "light" ? LightTheme : DarkTheme),
    [themeName]
  );

  let backgroundColor = themeColors.background;

  if (variant === "primary") {
    backgroundColor = themeColors.primary;
  } else if (variant === "danger") {
    backgroundColor = themeColors.error ?? themeColors.primary;
  }

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};
