import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, ViewStyle } from "react-native";
import { useAppSelector } from "../../store/app/hooks";

export interface IButton {
  title?: string;
  i18nKey?: string;
  i18nParams?: Record<string, any>;
  loadEnabled?: boolean;
  normal?: boolean;
  outline?: boolean;
  styles?: ViewStyle;
  /**
   * Override the background color (for solid) or border color (for outline).
   * Defaults to theme.primary.
   */
  color?: string;
  /**
   * Optional text color override. Defaults to theme.primaryForeground or theme.text.
   */
  textColor?: string;
  onPress: () => void;
}

const AppButton: React.FC<IButton> = ({
  title,
  i18nKey,
  i18nParams,
  onPress,
  loadEnabled,
  normal,
  outline,
  styles,
  color,
  textColor,
}) => {
  const { t } = useTranslation();
  const themeName = useAppSelector(state => state.persisted_app.theme);
  const apptheme = useMemo(
    () => (themeName === "light" ? LightTheme : DarkTheme),
    [themeName]
  );

  // Use i18n if key is provided, otherwise use title prop
  const displayText = i18nKey ? t(i18nKey, i18nParams) : title || "";

  const baseColor = color ?? apptheme.primary;
  const baseTextColor =
    textColor ?? (outline ? apptheme.text : apptheme.primaryForeground);

  const baseStyle: ViewStyle = {
    height: 50,
    backgroundColor: outline ? "transparent" : baseColor,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    elevation: outline ? 0 : 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: outline ? 1.5 : 0,
    borderColor: outline ? (color ?? apptheme.border) : baseColor,
    paddingHorizontal: 24,
    minWidth: 120,
    ...(styles as ViewStyle),
  };

  const display = displayText.toUpperCase();
  return (
    <TouchableOpacity
      style={baseStyle}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text
        numberOfLines={1}
        style={{
          color: baseTextColor,
          fontSize: 16,
          fontWeight: "600",
          letterSpacing: 0.5,
        }}
      >
        {display}
      </Text>
    </TouchableOpacity>
  );
};

export default AppButton;

