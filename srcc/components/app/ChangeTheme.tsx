import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setTheme } from '@/src/store/reducers/persistedAppSlice';
import { TouchableOpacity } from 'react-native';
import IconApp from './IconApp';

export default function ChangeTheme() {
  // const { colorScheme, setThemeMode, themeMode } = useTheme();
  // const isDark = colorScheme === 'dark';
  const theme = useAppSelector(state => state.persisted_app.theme);
  const dispatch = useAppDispatch();

  // useEffect(() => {
  //   if (theme === 'dark') {
  //     NavigationBar.setBackgroundColorAsync('#ff0000');
  //     NavigationBar.setButtonStyleAsync('light'); // icônes claires
  //   } else {
  //     NavigationBar.setBackgroundColorAsync('#ffffff');
  //     NavigationBar.setButtonStyleAsync('dark'); // icônes sombres
  //   }
  // }, [theme]);

  return (
    <TouchableOpacity onPress={() => dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))}>
      {/* <ContextMenu style={{}}>
        <ContextMenu.Items>
          <Button onPress={() => dispatch(setTheme('light'))}>Light</Button>
          <Button onPress={() => dispatch(setTheme('dark'))}>Dark</Button>
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <IconApp pack='FI' name="circle" size={60} color={theme === 'light' ? LightTheme.text : DarkTheme.text} styles={{ marginHorizontal: 15 }} /> 

          <AppText text='okok' />
        </ContextMenu.Trigger>
      </ContextMenu> */}
      <IconApp pack='FI' name={theme === 'dark' ? "sun" : "moon"} size={25} color={theme === 'light' ? LightTheme.text : DarkTheme.text} styles={{  }} />
    </TouchableOpacity>
  );
}

