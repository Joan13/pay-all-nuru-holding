import { TUserData } from '@/src/Types';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Configure Google Sign-In
 * Should be called once when the app starts
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '848614197956-07m26uktq5pj7d9q9u4tu677o15b6afp.apps.googleusercontent.com',
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};

/**
 * Sign out from Google Sign-In
 * Handles the case where Google Sign-In might not be configured
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    // Ensure Google Sign-In is configured before signing out
    configureGoogleSignIn();
    
    // Try to get current user to check if signed in
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        // User is signed in, proceed with sign out
        await GoogleSignin.signOut();
      }
    } catch (getUserError) {
      // If getCurrentUser fails, user might not be signed in
      // Try to sign out anyway (it's safe to call even if not signed in)
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        // Ignore sign out errors if user wasn't signed in
        console.log('No active Google session to sign out from');
      }
    }
  } catch (error) {
    // If sign out fails, log but don't throw - we still want to clear local state
    console.error('Google Sign-Out Error:', error);
  }
};

/**
 * Get empty user data object matching TUserData type
 */
export const getEmptyUserData = (): TUserData => ({
  _id: '',
  names: '',
  gender: 0,
  country: '',
  city: '',
  state: '',
  address: '',
  phone_number: '',
  user_email: '',
  user_password: '',
  profile_picture: '',
  account_type: 0,
  createdAt: '',
  updatedAt: '',
});

