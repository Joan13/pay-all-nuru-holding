import { ViewStyle } from "react-native";
import { useAppSelector } from "../../store/app/hooks";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import React, { useMemo } from "react";
import { DarkTheme, LightTheme } from "@/src/constants/Themes";

export interface ISwitchAppProps {
  value: boolean;
  loadEnabled?: boolean;
  small?: boolean;
  disabled?: boolean;
  styles?: ViewStyle;
  color?: string;
  onPress?: (nextValue: boolean) => void;
}

const normalizeColor = (color: string): string => {
  if (!color) return color;
  if (color.startsWith('#') && color.length === 4) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
};

const SwitchApp: React.FC<ISwitchAppProps> = ({
  value,
  disabled,
  onPress,
  color,
}) => {
  const themeName = useAppSelector(state => state.persisted_app.theme);
  const themeColors = useMemo(
    () => (themeName === "light" ? LightTheme : DarkTheme),
    [themeName]
  );

  const primaryColor = color ?? themeColors.primary;

  return (
    <Host matchContents>
      <Switch
        onCheckedChange={onPress}
        value={value}
        colors={{
          checkedThumbColor: normalizeColor(themeColors.background),
          checkedTrackColor: normalizeColor(primaryColor),
          uncheckedThumbColor: normalizeColor(themeColors.background),
          uncheckedTrackColor: normalizeColor(themeColors.gray),
          uncheckedBorderColor: normalizeColor(themeColors.border),

          disabledCheckedThumbColor: normalizeColor(themeColors.background),
          disabledCheckedTrackColor: normalizeColor(themeColors.gray + "50"),

          disabledUncheckedThumbColor: normalizeColor(themeColors.background),
          disabledUncheckedTrackColor: normalizeColor(themeColors.gray + "50"),
          disabledUncheckedBorderColor: normalizeColor(themeColors.gray + "50"),
        }}
        enabled={!disabled}
      />
    </Host>
  );
};

export default SwitchApp;
