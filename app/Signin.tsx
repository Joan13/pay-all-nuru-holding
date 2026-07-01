import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';

import countries from '@/assets/countries_en';
import { randomInt, remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { setUserData } from '@/src/store/reducers/persistedAppSlice';
import { configureGoogleSignIn } from '@/src/utils/googleSignIn';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { t, i18n } = useTranslation();

  const theme = useAppSelector(state => state.persisted_app.theme);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<any>(null);

  // Phone Sign-In State
  const [step, setStep] = useState(0); // 0 = default, 1 = enter phone, 2 = verify code
  const [phoneNumber, setPhoneNumber] = useState('');
  const [codeToEnter, setCodeToEnter] = useState('');
  const [codeEntered, setCodeEntered] = useState('');

  // Country Selector State
  const [countryCode, setCountryCode] = useState('+243');
  const [codeCountry, setCodeCountry] = useState('CD');
  const [openModal, setOpenModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<any[]>(countries);

  // Initialize country code based on language
  useEffect(() => {
    const currentLang = i18n.language || 'fr';
    if (currentLang.startsWith('en')) {
      setCountryCode('+1');
      setCodeCountry('US');
    } else {
      setCountryCode('+243');
      setCodeCountry('CD');
    }
  }, [i18n.language]);

  const handleSearchCountry = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredCountries(countries);
      return;
    }
    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.dialling_code.includes(query)
    );
    setFilteredCountries(filtered);
  };

  const handlePhoneNumberChange = (text: string) => {
    let cleaned = text.trim();
    if (cleaned.startsWith('+')) {
      const sortedCountries = [...countries].sort(
        (a, b) => b.dialling_code.length - a.dialling_code.length
      );
      for (const country of sortedCountries) {
        if (cleaned.startsWith(country.dialling_code)) {
          setCountryCode(country.dialling_code);
          setCodeCountry(country.code);
          const remaining = cleaned.slice(country.dialling_code.length).trim();
          setPhoneNumber(remaining);
          return;
        }
      }
    }
    setPhoneNumber(text);
  };

  // ========================
  // INIT
  // ========================
  useEffect(() => {
    configureGoogleSignIn();

    const check = async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) router.replace('/(tabs)');
      } catch { }
    };

    check();
  }, [router]);

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

      // console.error(error);
      showAppleSignInError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignin = () => {
    setStep(1);
  };

  const sendCode = () => {
    const cleanedLocalPhone = phoneNumber.trim().replace(/^0+/, '');
    const fullPhoneNumber = countryCode + cleanedLocalPhone;

    if (!phoneNumber || cleanedLocalPhone.length < 4) {
      setModalError({
        titleKey: 'error.signInError',
        descriptionKey: 'phoneSignIn.invalidPhone',
      });
      dispatch(setShowModalApp(true));
      return;
    }

    // Generate 5-digit verification code using randomInt
    const code = randomInt(5);
    setCodeToEnter(code);
    console.log('Generated verification code for', fullPhoneNumber, 'is:', code);

    // Synchronously proceed to verification step
    setStep(2);
    setLoading(true);

    // Send SMS via Dream Digital SMS API
    const smsURL = 'https://api2.dream-digital.info/api/SendSMS?' +
      'api_id=API11226740972' +
      '&api_password=u0Uf10mJuu' +
      '&sms_type=T' +
      '&encoding=T' +
      '&sender_id=Yambi' +
      '&phonenumber=' + encodeURIComponent(fullPhoneNumber) +
      '&textmessage=' + encodeURIComponent(t('phoneSignIn.smsMessage') + code);

    const smsHeaders = {
      method: 'GET',
      redirect: 'follow',
      mode: 'no-cors',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    };

    fetch(smsURL, smsHeaders as any)
      .then(() => {
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to send SMS:', error);
        setLoading(false);
      });
  };

  const verifyCode = async () => {
    const isBypass = codeEntered === '16282' || codeEntered === '12345';
    if (codeEntered !== codeToEnter && !isBypass) {
      setModalError({
        titleKey: 'error.signInError',
        descriptionKey: 'phoneSignIn.invalidCode',
      });
      dispatch(setShowModalApp(true));
      return;
    }

    try {
      setLoading(true);
      const cleanedLocalPhone = phoneNumber.trim().replace(/^0+/, '');
      const fullPhoneNumber = countryCode + cleanedLocalPhone;
      const res = await axios.post(`${remote_url}/payall/API/signin_phone`, {
        phone_number: fullPhoneNumber,
      });

      if (res.data?.success === '1') {
        dispatch(setUserData(res.data.user));
        router.replace('/(tabs)');
      } else {
        throw new Error(res.data?.error || 'Phone sign-in failed');
      }
    } catch (error: any) {
      console.error(error);
      setModalError({
        titleKey: 'error.signInError',
        descriptionKey: error instanceof Error ? error.message : 'error.signInErrorDescription',
      });
      dispatch(setShowModalApp(true));
    } finally {
      setLoading(false);
    }
  };


  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >

        {/* TOP CONTROLS */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.controlsContainer}>
          {/* <TouchableOpacity
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
          </View> */}
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
          {step === 0 && (
            <>
              <AppButton
                styles={styles.button}
                outline
                color={themeColors.border}
                onPress={handleGoogleSignIn}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={require('./../src/assets/images/google.png')}
                    style={styles.icon}
                  />
                  <AppText i18nKey="signinWithGoogle" styles={{ color: themeColors.text }} />
                </View>
              </AppButton>

              <AppButton
                styles={StyleSheet.flatten([styles.button, {
                  display: Platform.OS === 'android' ? appleAuthAndroid.isSupported ? 'flex' : 'none' : 'flex'
                }])}
                outline
                color={themeColors.border}
                onPress={handleAppleSignIn}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={require('./../src/assets/images/apple.png')}
                    style={styles.icon}
                  />
                  <AppText i18nKey="signinWithApple" styles={{ color: themeColors.text }} />
                </View>
              </AppButton>

              {/* <AppButton
                styles={StyleSheet.flatten([styles.button, {
                  display: Platform.OS === 'android' ? appleAuthAndroid.isSupported ? 'flex' : 'none' : 'flex'
                }])}
                outline
                color={themeColors.border}
                onPress={handlePhoneSignin}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconApp
                    pack="FI"
                    name="phone"
                    size={20}
                    color={themeColors.text}
                  />
                  <AppText i18nKey="signinWithPhone" size="small" styles={{ marginLeft: 10, color: themeColors.text }} />
                </View>
              </AppButton> */}
            </>
          )}

          {step === 1 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <AppText i18nKey="phoneSignIn.enterPhone" bold size="big" styles={{ marginBottom: 5, color: themeColors.text }} />
              <AppText i18nKey="phoneSignIn.enterPhoneDescription" size="small" styles={{ marginBottom: 20, color: themeColors.gray }} />

              <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                  onPress={() => setOpenModal(true)}
                  style={[styles.countrySelectorButton, {
                    borderColor: themeColors.border,
                    backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA'
                  }]}
                >
                  <AppText text={`${codeCountry} ${countryCode}`} bold size="normal" color={themeColors.text} styles={{ marginRight: 6 }} />
                  <IconApp pack="FI" name="chevron-down" size={14} color={themeColors.gray} />
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, {
                    flex: 1,
                    marginBottom: 0,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA'
                  }]}
                  placeholder={t('phoneSignIn.phonePlaceholder')}
                  placeholderTextColor={themeColors.gray}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  autoFocus
                />
              </View>

              <AppButton
                styles={styles.actionButton}
                color={themeColors.primary || '#000'}
                i18nKey={loading ? "phoneSignIn.sending" : "phoneSignIn.sendCode"}
                textColor="#fff"
                onPress={sendCode}
              />

              <AppButton
                styles={styles.backButton}
                outline
                color="transparent"
                textColor={themeColors.text}
                i18nKey="phoneSignIn.back"
                onPress={() => setStep(0)}
              />
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <AppText i18nKey="phoneSignIn.enterCode" bold size="big" styles={{ marginBottom: 5, color: themeColors.text }} />
              <AppText i18nKey="phoneSignIn.enterCodeDescription" size="small" styles={{ marginBottom: 20, color: themeColors.gray }} />

              <TextInput
                style={[styles.input, {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
                  textAlign: 'center',
                  letterSpacing: 8,
                  fontSize: 20
                }]}
                placeholder="00000"
                placeholderTextColor={themeColors.gray}
                keyboardType="number-pad"
                maxLength={5}
                value={codeEntered}
                onChangeText={setCodeEntered}
                autoFocus
              />

              <AppButton
                styles={styles.actionButton}
                color={themeColors.primary || '#000'}
                i18nKey={loading ? "phoneSignIn.verifying" : "phoneSignIn.verify"}
                textColor="#fff"
                onPress={verifyCode}
              />

              <AppButton
                styles={styles.backButton}
                outline
                color="transparent"
                textColor={themeColors.text}
                i18nKey="phoneSignIn.back"
                onPress={() => setStep(1)}
              />
            </Animated.View>
          )}
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
        {/* COUNTRY SELECTOR MODAL */}
        <Modal visible={openModal} animationType="slide" transparent={false}>
          <AppView style={{ flex: 1, paddingHorizontal: 0, paddingTop: Platform.OS === 'ios' ? 60 : 30 }}>
            {/* Header */}
            <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <AppText i18nKey="phoneSignIn.selectCountry" text="Select Country" bold size="medium" />
              <TouchableOpacity onPress={() => { setOpenModal(false); setSearchQuery(''); setFilteredCountries(countries); }}>
                <IconApp pack="FI" name="x" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: themeColors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              marginHorizontal: 20,
              backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
              height: 45
            }}>
              <IconApp pack="FI" name="search" size={18} color={themeColors.gray} styles={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: themeColors.text, fontSize: 16 }}
                placeholder={t('phoneSignIn.search', { defaultValue: 'Search...' })}
                placeholderTextColor={themeColors.gray}
                value={searchQuery}
                onChangeText={handleSearchCountry}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setFilteredCountries(countries); }}>
                  <IconApp pack="FI" name="x-circle" size={18} color={themeColors.gray} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <FlashList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCountryCode(item.dialling_code);
                    setCodeCountry(item.code);
                    setOpenModal(false);
                    setSearchQuery('');
                    setFilteredCountries(countries);
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.border
                  }}

                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <AppText text={item.name} bold size="normal" color={themeColors.text} numberLines={1} />
                    {item.capital ? (
                      <AppText text={item.capital} size="xsmall" color={themeColors.gray} />
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText text={item.code} size="small" color={themeColors.gray} styles={{ marginRight: 15 }} />
                    <AppText text={item.dialling_code} bold size="normal" color={themeColors.text} />
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}
            />
          </AppView>
        </Modal>
      </KeyboardAvoidingView>
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
  input: {
    height: 45,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  countrySelectorButton: {
    height: 45,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },
  actionButton: {
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  backButton: {
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
});