import { Host, ModalBottomSheet, ModalBottomSheetRef, RNHostView } from "@expo/ui/jetpack-compose";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import { useAppSelector } from "@/src/store/app/hooks";

export interface IModalSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

const convertRgbaToAndroidHex = (rgba: string): string => {
  if (!rgba) return rgba;
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return rgba;
  const r = parseInt(match[1]).toString(16).padStart(2, "0");
  const g = parseInt(match[2]).toString(16).padStart(2, "0");
  const b = parseInt(match[3]).toString(16).padStart(2, "0");
  const a = match[4] ? Math.round(parseFloat(match[4]) * 255).toString(16).padStart(2, "0") : "ff";
  return `#${a}${r}${g}${b}`;
};

const ModalSheet: React.FC<IModalSheetProps> = ({ isPresented, onDismiss, children }) => {
  const themeName = useAppSelector((state) => state.persisted_app.theme);
  const themeColors = themeName === "light" ? LightTheme : DarkTheme;

  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isPresented) {
      setShouldRender(true);
    } else if (shouldRender) {
      // If the parent changes isPresented to false programmatically, animate closing first
      if (sheetRef.current) {
        sheetRef.current.hide().then(() => {
          setShouldRender(false);
        });
      } else {
        setShouldRender(false);
      }
    }
  }, [isPresented, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Host colorScheme={themeName as "light" | "dark"} style={StyleSheet.absoluteFill}>
      <ModalBottomSheet
        ref={sheetRef}
        onDismissRequest={onDismiss}
        containerColor={themeColors.modal_background}
        scrimColor={convertRgbaToAndroidHex(themeColors.modal_overlay)}
        showDragHandle={true}
      >
        <RNHostView matchContents={true}>
          <View style={{ width: "100%" }}>
            {children}
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
};

export default ModalSheet;
