import { Host, BottomSheet, Group, RNHostView } from "@expo/ui/swift-ui";
import { presentationDetents, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useAppSelector } from "@/src/store/app/hooks";

export interface IModalSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

const ModalSheet: React.FC<IModalSheetProps> = ({ isPresented, onDismiss, children }) => {
  const themeName = useAppSelector((state) => state.persisted_app.theme);

  return (
    <Host colorScheme={themeName as "light" | "dark"} style={StyleSheet.absoluteFill}>
      <BottomSheet
        isPresented={isPresented}
        onIsPresentedChange={(presented) => {
          if (!presented) {
            onDismiss();
          }
        }}
      >
        <Group
          modifiers={[
            presentationDetents(["medium", "large"]),
            presentationDragIndicator("visible"),
          ]}
        >
          <RNHostView matchContents={true}>
            <View style={{ width: "100%" }}>
              {children}
            </View>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
};

export default ModalSheet;
