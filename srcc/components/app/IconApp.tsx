import { AntDesign, Entypo, Feather, FontAwesome, FontAwesome5, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons, SimpleLineIcons } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';

interface IIconApp {
    name: string;
    color: string;
    pack: string;
    styles?: StyleProp<TextStyle>;
    size: number
}

const IconApp: React.FC<IIconApp> = ({ name, color, pack, styles, size }) => {

    // const theme = useAppSelector(state => state.app_theme);
    // const app_description = useAppSelector(state => state.persisted_app.app_description);

    if (pack === "FA") {
        return (
            <FontAwesome name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "FI") {
        return (
            <Feather name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "FA5") {
        return (
            <FontAwesome5 name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "FA6") {
        return (
            <FontAwesome6 name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "IO") {
        return (
            <Ionicons name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "MC") {
        return (
            <MaterialCommunityIcons name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "MT") {
        return (
            <MaterialIcons name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "ET") {
        return (
            <Entypo name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "AD") {
        return (
            <AntDesign name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "OC") {
        return (
            <Octicons name={name as any} style={styles} color={color} size={size} />
        )
    } else if (pack === "SLI") {
        return (
            <SimpleLineIcons name={name as any} style={styles} color={color} size={size} />
        )
    }
    else {
        return null;
    }
}

export default IconApp;
