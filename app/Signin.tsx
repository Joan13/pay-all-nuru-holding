import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';

import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import ChangeLanguage from '@/src/lang/ChangeLanguage';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { setTheme, setUserData } from '@/src/store/reducers/persistedAppSlice';
import { configureGoogleSignIn } from '@/src/utils/googleSignIn';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

import appleAuth, {
  appleAuthAndroid,
  AppleError,
} from '@invertase/react-native-apple-authentication';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

const Signin = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const theme = useAppSelector(state => state.persisted_app.theme);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<any>(null);

  // ========================
  // INIT
  // ========================
  useEffect(() => {
    configureGoogleSignIn();

    const check = async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) router.replace('/(tabs)');
      } catch (e) { }
    };

    check();
  }, []);

  // ========================
  // GOOGLE SIGN-IN
  // ========================
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const userInfo = await GoogleSignin.signIn();
      const user = (userInfo as any)?.data?.user || userInfo;

      const payload = {
        user_email: user.email || '',
        names: user.name || '',
        gender: 0,
        country: '',
        city: 'Unknown',
        state: '',
        address: '',
        phone_numbers: [],
        user_password: '',
        profile_picture: user.photo || '',
        account_type: 0,
        is_admin: false,
      };

      const res = await axios.post(`${remote_url}/payall/API/signin`, payload);

      if (res.data?.success === '1') {
        dispatch(setUserData(res.data.user));
        router.replace('/(tabs)');
      } else {
        throw new Error('Google sign-in failed');
      }

    } catch (error: any) {
      console.error(error);
      setModalError({
        titleKey: 'error.signInError',
        descriptionKey: 'error.signInErrorDescription',
      });
      dispatch(setShowModalApp(true));
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // APPLE SIGN-IN
  // ========================
  const completeAppleSignIn = async (
    body: Record<string, unknown>
  ): Promise<void> => {
    const resp = await axios.post(`${remote_url}/payall/API/signin`, body);

    if (resp.data?.success === '1') {
      dispatch(setUserData(resp.data.user));
      router.replace('/(tabs)');
      return;
    }

    throw new Error('Apple sign-in failed');
  };

  const showAppleSignInError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'error.signInErrorDescription';

    setModalError({
      titleKey: 'error.signInError',
      descriptionKey: message,
    });
    dispatch(setShowModalApp(true));
  };

  const signInWithAppleAndroid = async () => {
    const rawNonce = uuid();
    const state = uuid();

    appleAuthAndroid.configure({
      clientId: 'com.payallapp.servicesid',
      redirectUri: 'https://payall-adb74.firebaseapp.com/__/auth/handler',
      responseType: appleAuthAndroid.ResponseType.ALL,
      scope: appleAuthAndroid.Scope.ALL,
      nonce: rawNonce,
      state,
    });

    const response = await appleAuthAndroid.signIn();
    const user = response.user;

    if (user?.email) {
      await completeAppleSignIn({
        user_email: user.email,
        names: `${user.name?.firstName ?? ''} ${user.name?.lastName ?? ''}`.trim(),
        gender: 0,
        country: '',
        city: 'Unknown',
        state: '',
        address: '',
        phone_numbers: [],
        user_password: '',
        profile_picture: '',
        account_type: 0,
        is_admin: false,
      });
      return;
    }

    if (!response.id_token) {
      throw new Error('No Apple id_token');
    }

    await completeAppleSignIn({ id_token: response.id_token });
  };

  const signInWithAppleIOS = async () => {
    const appleResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const { identityToken, email, fullName } = appleResponse;

    if (!identityToken) {
      throw new Error('No Apple identity token');
    }

    if (email) {
      const names = [fullName?.givenName, fullName?.familyName]
        .filter(Boolean)
        .join(' ');

      await completeAppleSignIn({
        user_email: email,
        names,
        gender: 0,
        country: '',
        city: 'Unknown',
        state: '',
        address: '',
        phone_numbers: [],
        user_password: '',
        profile_picture: '',
        account_type: 0,
        is_admin: false,
      });
      return;
    }

    await completeAppleSignIn({ id_token: identityToken });
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);

      if (Platform.OS === 'ios') {
        if (!appleAuth.isSupported) {
          throw new Error('Sign in with Apple is not supported on this device');
        }
        await signInWithAppleIOS();
      } else {
        await signInWithAppleAndroid();
      }
    } catch (error: any) {
      if (error?.code === AppleError.CANCELED) {
        return;
      }

      console.error(error);
      showAppleSignInError(error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <AppView style={styles.container}>
      <StatusBarApp />

      {/* TOP CONTROLS */}
      <Animated.View entering={FadeIn.delay(200)} style={styles.controlsContainer}>
        <TouchableOpacity
          onPress={() =>
            dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))
          }
        >
          <IconApp
            pack="FI"
            name={theme === 'dark' ? "sun" : "moon"}
            size={24}
            color={themeColors.text}
          />
        </TouchableOpacity>

        <View style={{ marginLeft: 15 }}>
          <ChangeLanguage />
        </View>
      </Animated.View>

      {/* CONTENT */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.contentContainer}>
        <Animated.View entering={FadeInUp.delay(400)} style={styles.logoContainer}>
          <Image
            source={require('./../src/assets/images/logo.png')}
            style={styles.logo}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500)}>
          <AppText i18nKey="signin" size="xlarge" bold />
        </Animated.View>
      </Animated.View>

      {/* BUTTONS */}
      <Animated.View entering={FadeInUp.delay(600)} style={styles.bottom}>
        <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
          <Image
            source={require('./../src/assets/images/google.png')}
            style={styles.icon}
          />
          <AppText i18nKey="signinWithGoogle" />
        </TouchableOpacity>
        {/* {appleAuthAndroid.isSupported && ( */}
          <TouchableOpacity style={[styles.button, {
            display: Platform.OS==='android'? appleAuthAndroid.isSupported?'flex':'none':'flex'
          }]} onPress={handleAppleSignIn} disabled={loading}>
            <Image
              source={require('./../src/assets/images/apple.png')}
              style={styles.icon}
            />
            <AppText i18nKey="signinWithApple" />
          </TouchableOpacity>
        {/* )} */}

      </Animated.View>

      {/* MODAL */}
      {modalError && (
        <ModalApp
          titleKey={modalError.titleKey}
          descriptionKey={modalError.descriptionKey}
          singleButton
          textCancelKey="close"
          onClose={() => {
            setModalError(null);
            dispatch(setShowModalApp(false));
          }}>
          <AppText i18nKey="close" styles={{ display: 'none' }} />
        </ModalApp>
      )}
    </AppView>

  );
};

export default Signin;

// ========================
// STYLES
// ========================
const styles = StyleSheet.create({
  container: { flex: 1 },

  controlsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoContainer: {
    width: 140,
    height: 140,
    backgroundColor: '#000',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },

  logo: {
    width: 90,
    height: 70,
  },

  bottom: {
    padding: 30,
    paddingBottom: 50,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },

  icon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
});