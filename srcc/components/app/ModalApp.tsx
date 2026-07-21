import React, { ReactNode } from "react";
import { Modal, Pressable, TouchableWithoutFeedback, useWindowDimensions, View } from "react-native";
import { DarkTheme, LightTheme } from "../../constants/Themes";
import { useAppDispatch, useAppSelector } from "../../store/app/hooks";
import { setShowModalApp } from "../../store/reducers/appSlice";
import AppText from "./Text";

export interface IModalApp {
    title?: string;
    titleKey?: string;
    description?: string;
    descriptionKey?: string;
    textAction?: string;
    textActionKey?: string;
    textCancel?: string;
    textCancelKey?: string;
    singleButton: boolean;
    paddings?: boolean;
    children: ReactNode;
    onAction?: () => void;
    onCancel?: () => void;
    onClose: () => void;
}

const ModalApp: React.FC<IModalApp> = ({ 
    title, 
    titleKey,
    description, 
    descriptionKey,
    textAction, 
    textActionKey,
    textCancel, 
    textCancelKey,
    singleButton, 
    onAction, 
    onCancel, 
    onClose, 
    children, 
    paddings 
}) => {
    const theme = useAppSelector(state => state.persisted_app.theme);
    const modal_app = useAppSelector(state => state.app.modal_app);
    const modal_height = useWindowDimensions().height;
    const dispatch = useAppDispatch();
    const themeColors = theme === 'light' ? LightTheme : DarkTheme;

    const handleClose = () => {
        onClose();
        dispatch(setShowModalApp(false));
    };

    const handleAction = () => {
        if (onAction) {
            onAction();
        }
        handleClose();
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        handleClose();
    };

    if (modal_app) {
        return (
            <Modal
                onRequestClose={handleClose}
                animationType="fade"
                statusBarTranslucent={true}
                hardwareAccelerated={true}
                transparent={true}>
                <View style={{
                    flex: 1,
                    backgroundColor: themeColors.modal_overlay,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0
                        }} />
                    </TouchableWithoutFeedback>
                    
                    <View style={{
                        backgroundColor: themeColors.modal_background,
                        borderRadius: 12,
                        width: 300,
                        maxHeight: modal_height - 150,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 10,
                    }}>
                        {(title || titleKey) && (
                            <View style={{
                                paddingVertical: 15,
                                paddingHorizontal: 20,
                                borderBottomWidth: 1,
                                borderColor: themeColors.border
                            }}>
                                <AppText 
                                    text={title}
                                    i18nKey={titleKey}
                                    bold 
                                    size="medium"
                                    styles={{ textAlign: 'center' }} 
                                />
                            </View>
                        )}
                        
                        {(description || descriptionKey) && (
                            <View style={{
                                paddingHorizontal: 20,
                                paddingTop: 15,
                                paddingBottom: 10,
                            }}>
                                <AppText 
                                    text={description}
                                    i18nKey={descriptionKey}
                                    size="small"
                                    styles={{ textAlign: 'center', color: themeColors.gray }} 
                                />
                            </View>
                        )}
                        
                        <View style={{
                            paddingHorizontal: paddings === false ? 0 : 15,
                            paddingVertical: paddings === false ? 0 : 15,
                            maxHeight: 400,
                            width: "100%",
                        }}>
                            {children}
                        </View>
                        
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderTopWidth: 1,
                            borderColor: themeColors.border,
                        }}>
                            {!singleButton ? (
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%'
                                }}>
                                    <Pressable
                                        style={{
                                            flex: 1,
                                            height: 45,
                                            justifyContent: "center",
                                            alignItems: 'center',
                                            borderRightWidth: 1,
                                            borderColor: themeColors.border,
                                        }}
                                        onPress={handleCancel}>
                                        <AppText 
                                            text={textCancel}
                                            i18nKey={textCancelKey || 'close'}
                                            size="small"
                                            styles={{ color: themeColors.error }}
                                        />
                                    </Pressable>
                                    <Pressable
                                        style={{
                                            flex: 1,
                                            height: 45,
                                            justifyContent: "center",
                                            alignItems: 'center',
                                        }}
                                        onPress={handleAction}>
                                        <AppText 
                                            text={textAction}
                                            i18nKey={textActionKey}
                                            bold
                                            size="small"
                                            styles={{ color: themeColors.primary }}
                                        />
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    style={{
                                        flex: 1,
                                        height: 45,
                                        justifyContent: "center",
                                        alignItems: 'center',
                                    }}
                                    onPress={handleClose}>
                                    <AppText 
                                        text={textCancel}
                                        i18nKey={textCancelKey || 'close'}
                                        size="small"
                                        styles={{ color: themeColors.error }}
                                    />
                                </Pressable>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
    
    return null;
};

export default ModalApp;
