import { ViewStyle } from "react-native";
import { useAppSelector } from "../../store/app/hooks";
import { Host, Toggle } from "@expo/ui/swift-ui";
import { disabled as disabledModifier, tint } from "@expo/ui/swift-ui/modifiers";
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
      <Toggle
        isOn={value}
        onIsOnChange={onPress}
        modifiers={[
          tint(primaryColor),
          disabledModifier(!!disabled),
        ]}
      />
    </Host>
  );
};

export default SwitchApp;
