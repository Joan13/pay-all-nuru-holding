import { DarkTheme, LightTheme } from "@/src/constants/Themes";
import { useAppSelector } from "@/src/store/app/hooks";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, TextStyle } from "react-native";

export interface IText {
    text?: string;
    i18nKey?: string;
    i18nParams?: Record<string, any>;
    bold?: boolean;
    underline?: boolean;
    styles?: TextStyle;
    /**
     * Theme color key OR a hex string.
     * Allowed keys:
     * background, text, status_bar, error, success,
     * primary, gray, border, primaryForeground
     */
    color?: keyof typeof LightTheme | string;
    size?: "xsmall" | "small" | "normal" | "medium" | "big" | "xlarge";
    numberLines?: number;
    toUpperCase?: boolean;
    toLowerCase?: boolean;
}

const AppText: React.FC<IText> = ({
    text,
    i18nKey,
    i18nParams,
    bold,
    underline,
    styles,
    numberLines,
    size = "normal",
    color,
    toUpperCase,
    toLowerCase,
}) => {
    const { t } = useTranslation();
    const themeName = useAppSelector((state) => state.persisted_app.theme);
    const theme = themeName === "light" ? LightTheme : DarkTheme;

    const fontSizeMap = {
        xsmall: 12,
        small: 14,
        normal: 16,
        medium: 18,
        big: 20,
        xlarge: 24,
    };

    // Resolve final text (translation + case transformation)
    const displayText = useMemo(() => {
        let txt = i18nKey ? t(i18nKey, i18nParams) : text || "";

        if (toUpperCase) {
            txt = txt.toUpperCase();
        } else if (toLowerCase) {
            txt = txt.toLowerCase();
        }

        return txt;
    }, [i18nKey, i18nParams, text, t, toUpperCase, toLowerCase]);

    // Resolve theme color or custom hex value
    const resolvedColor = useMemo(() => {
        if (!color) return theme.text;

        if (typeof color === "string" && theme[color as keyof typeof theme]) {
            return theme[color as keyof typeof theme];
        }

        return color; // fallback to custom string
    }, [color, theme]);

    return (
        <Text
            numberOfLines={numberLines}
            style={[
                styles,
                {
                    color: resolvedColor,
                    fontSize: fontSizeMap[size],
                    fontWeight: bold ? "900" : "normal",
                    textDecorationLine: underline ? "underline" : "none",
                },
            ]}
        >
            {displayText}
        </Text>
    );
};

export default AppText;
