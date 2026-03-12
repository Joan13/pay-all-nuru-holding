import { useAppSelector } from '@/src/store/app/hooks';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const userData = useAppSelector(state => state.persisted_app.user_data);

  useEffect(() => {
    if (rootNavigationState?.key) {
      BootSplash.hide({ fade: true });
    }
  }, [rootNavigationState?.key]);

  // Check if user is signed in
  if (userData && userData._id) {
    return <Redirect href="/(tabs)" />;
  }

  // Redirect to onboarding if not signed in
  return <Redirect href="/Onboarding" />;
}
