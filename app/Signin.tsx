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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

const Signin = () => {
  const router = useRouter();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const dispatch = useAppDispatch();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<{ titleKey: string; descriptionKey: string } | null>(null);

  useEffect(() => {
    // Initialize Google Sign-In
    configureGoogleSignIn();

    // Check if user is already signed in
    const checkIfSignedIn = async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          // User is already signed in, navigate to Home (tabs)
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error checking sign-in status:', error);
      }
    };
    checkIfSignedIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      // Handle the response - Google Sign-In response structure varies by version
      // Try multiple possible structures
      const user = (userInfo as any).data?.user || (userInfo as any).user || (userInfo as any).data || userInfo;
      
      if (user && (user.id || user.email)) {
        // Map Google user data to your user_data structure
        const currentDate = new Date().toISOString();
        const userEmail = user.email || '';
        
        // Check if this is the admin email
        const isAdminEmail = userEmail.toLowerCase() === 'joan.agisha@gmail.com';
        
        const userDataPayload = {
          user_email: userEmail,
          names: user.name || user.givenName || '',
          gender: 0, // Default value, can be updated later
          country: '',
          city: 'Unknown', // Required field in backend User model - cannot be empty
          state: '',
          address: '',
          phone_numbers: [],
          user_password: '', // No password for OAuth sign-in
          profile_picture: user.photo || '',
          account_type: isAdminEmail ? 2 : 0,
          is_admin: isAdminEmail ? true : false,
        };

          // Call backend API to sign in or create user using axios
          try {
            const signinUrl = `${remote_url}/payall/API/signin`;
            const apiResponse = await axios.post(signinUrl, userDataPayload, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            // Only consider user signed in if we receive a valid response from the server
            if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
              // Store user data from API response in Redux
              // The API returns the user with _id from database
              // Ensure admin email always has admin privileges
              const finalAccountType = isAdminEmail ? 2 : (apiResponse.data.user.account_type ?? userDataPayload.account_type);
              const finalIsAdmin = isAdminEmail ? true : (apiResponse.data.user.is_admin ?? userDataPayload.is_admin ?? false);
              
              const userData = {
                _id: apiResponse.data.user._id || user.id || '',
                names: apiResponse.data.user.names || userDataPayload.names,
                gender: apiResponse.data.user.gender ?? userDataPayload.gender,
                country: apiResponse.data.user.country || userDataPayload.country,
                city: apiResponse.data.user.city || userDataPayload.city,
                state: apiResponse.data.user.state || userDataPayload.state,
                address: apiResponse.data.user.address || userDataPayload.address,
                phone_numbers: apiResponse.data.user.phone_numbers || userDataPayload.phone_numbers || [],
                user_email: apiResponse.data.user.user_email || userDataPayload.user_email,
                user_password: apiResponse.data.user.user_password || userDataPayload.user_password,
                profile_picture: apiResponse.data.user.profile_picture || userDataPayload.profile_picture,
                account_type: finalAccountType,
                is_admin: finalIsAdmin,
                createdAt: apiResponse.data.user.createdAt || currentDate,
                updatedAt: apiResponse.data.user.updatedAt || currentDate,
              };

              dispatch(setUserData(userData));
              setLoading(false);
              
              // Navigate to Home (tabs)
              router.replace('/(tabs)');
            } else {
              // API returned an error or invalid response
              setLoading(false);
              console.error('API Response Error:', apiResponse.data);
              setModalError({
                titleKey: 'error.signInError',
                descriptionKey: apiResponse.data?.error || 'error.signInErrorDescription',
              });
              dispatch(setShowModalApp(true));
            }
          } catch (apiError: any) {
            // Handle API errors
            setLoading(false);
            console.error('API Sign-In Error:', apiError);
            if (apiError.response) {
              console.error('API Error Response:', apiError.response.data);
              console.error('API Error Status:', apiError.response.status);
            }
            setModalError({
              titleKey: 'error.signInError',
              descriptionKey: apiError.response?.data?.error || apiError.message || 'error.signInErrorDescription',
            });
            dispatch(setShowModalApp(true));
            return; // Exit early to avoid throwing the error again
          }
      } else {
        setLoading(false);
        throw new Error('Failed to get user information from Google Sign-In');
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      setLoading(false);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
        setModalError({
          titleKey: 'error.signInCancelled',
          descriptionKey: 'error.signInCancelledDescription',
        });
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation (e.g. sign in) is in progress already
        setModalError({
          titleKey: 'error.signInInProgress',
          descriptionKey: 'error.signInInProgressDescription',
        });
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Play services not available or outdated
        setModalError({
          titleKey: 'error.playServicesError',
          descriptionKey: 'error.playServicesErrorDescription',
        });
      } else {
        // Some other error happened
        setModalError({
          titleKey: 'error.signInError',
          descriptionKey: 'error.signInErrorDescription',
        });
      }
      dispatch(setShowModalApp(true));
    }
  };

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      
      {/* Theme Toggle and Language Toggle */}
      <Animated.View 
        entering={FadeIn.delay(200)}
        style={styles.controlsContainer}
      >
        <TouchableOpacity 
          onPress={() => dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))}
          style={styles.controlButton}
        >
          <IconApp 
            pack="FI" 
            name={theme === 'dark' ? "sun" : "moon"} 
            size={25} 
            color={themeColors.text} 
            styles={{}}
          />
        </TouchableOpacity>
        <View style={{ marginLeft: 15 }}>
          <ChangeLanguage />
        </View>
      </Animated.View>

      <Animated.View 
        entering={FadeInDown.delay(300)}
        style={styles.contentContainer}
      >
        {/* Logo Section with Black Background */}
          <Animated.View
          entering={FadeInUp.delay(400)}
        sharedTransitionTag='logo-view'
          style={styles.logoContainer}
        >
                  <Animated.Image
            source={require('./../src/assets/images/logo.png')}
                    style={styles.logo}
                    sharedTransitionTag='logo'
                  />
                </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.titleContainer}>
          <AppText 
            i18nKey="signin"
            size="xlarge"
            bold
            styles={styles.title}
          />
        </Animated.View>

        {/* Advantages Message */}
        <Animated.View 
          entering={FadeInUp.delay(600)}
          style={styles.advantagesContainer}
        >
          <AppText 
            i18nKey="signinAdvantages"
            size="small"
            styles={{ textAlign: 'center', lineHeight: 20, color: themeColors.gray }}
          />
          {/* See Map Text - Clickable */}
          <Animated.View 
            entering={FadeInUp.delay(550)}
            style={styles.seeMapContainer}
          >
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push('/Map')}
            >
              <AppText 
                i18nKey="seeMap"
                size="small"
                color="primary"
                styles={{ textDecorationLine: 'underline' }}
              />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Sign in with Google Button - At Bottom */}
      <Animated.View 
        entering={FadeInUp.delay(700)}
        style={styles.bottomButtonContainer}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          disabled={loading}
          onPress={handleGoogleSignIn}
          style={[
            styles.googleButton,
            {
              borderColor: themeColors.border,
              backgroundColor: theme === 'light' ? '#fff' : themeColors.background,
              opacity: loading ? 0.6 : 1,
            }
          ]}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <AppText 
                i18nKey="loading"
                size="small"
                styles={styles.googleButtonText}
              />
            </View>
          ) : (
            <>
              <Image
            source={require('./../src/assets/images/google.png')}
                style={styles.googleIcon}
          />
              <AppText 
                i18nKey="signinWithGoogle"
                size="small"
                styles={styles.googleButtonText}
              />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Error Modal */}
      {modalError && (
        <ModalApp
          titleKey={modalError.titleKey}
          descriptionKey={modalError.descriptionKey}
          singleButton={true}
          textCancelKey="close"
          onClose={() => {
            setModalError(null);
            dispatch(setShowModalApp(false));
          }}
        >
          <View />
        </ModalApp>
      )}
    </AppView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    // Additional styling if needed
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 100,
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: 100,
    height: 80,
  },
  titleContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  seeMapContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  advantagesContainer: {
    width: '100%',
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  advantagesText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomButtonContainer: {
    width: '100%',
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  googleButton: {
    width: '100%',
    height: 40,
    borderWidth: 1.5,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  googleIcon: {
    height: 24,
    width: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Signin;
