import AppText from "@/src/components/app/Text";
import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import React, { useMemo, useState } from "react";
import {
    Pressable,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { useAppSelector } from "../../store/app/hooks";

export interface DropdownMenuItem {
  key: string;
  label?: string;
  /**
   * Optional translation key for the label.
   */
  i18nKey?: string;
  onPress: () => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  /**
   * Optional override for the menu width.
   */
  menuStyle?: ViewStyle;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  menuStyle,
}) => {
  const [visible, setVisible] = useState(false);
  const themeName = useAppSelector(state => state.persisted_app.theme);

  const themeColors = useMemo(
    () => (themeName === "light" ? LightTheme : DarkTheme),
    [themeName]
  );

  const open = () => setVisible(true);
  const close = () => setVisible(false);

  return (
    <View style={styles.root}>
      <Pressable onPress={open}>{trigger}</Pressable>

      {visible && (
        <Pressable style={styles.backdrop} onPress={close}>
          <View
            style={[
              styles.menuContainer,
              {
                backgroundColor:
                  themeColors.modal_background ?? themeColors.background,
              },
              menuStyle,
            ]}
          >
            {items.map(item => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: pressed
                      ? themeColors.primary + "15"
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  close();
                  item.onPress();
                }}
              >
                <AppText
                  text={item.label}
                  i18nKey={item.i18nKey}
                  size="small"
                  styles={{ color: themeColors.text }}
                />
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  menuContainer: {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 180,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
});

export default DropdownMenu;

