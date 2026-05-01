import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import i18n from '@/src/lang/i18nextConfig';
import { LangCode } from '@/src/lang/LanguageUtils';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { setLanguage, setTheme, setUserData } from '@/src/store/reducers/persistedAppSlice';
import { TUserData } from '@/src/Types';
import { getEmptyUserData, signOutGoogle } from '@/src/utils/googleSignIn';
import axios from 'axios';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Settings() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const dispatch = useAppDispatch();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const isDriver = userData.account_type === 1;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const persistedLanguage = useAppSelector(state => state.persisted_app.language);
  const currentLanguage = persistedLanguage || i18n.language || LangCode.fr;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: t('settings.title'),
    });
  }, [navigation, t]);

  const fetchUserData = useCallback(async () => {
    try {
      const getUserUrl = `${remote_url}/payall/API/get_user`;
      const apiResponse = await axios.post(getUserUrl, {
        user_id: userData?._id,
        requested_by: userData?._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
        dispatch(setUserData(apiResponse.data.user as TUserData));
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
    }
  }, [userData?._id, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  }, [fetchUserData]);

  const resetNavigationToOnboarding = () => {
    // Do not use CommonActions.reset here: Expo Router’s root uses an internal slot, so RESET
    // with { name: 'Onboarding' } is not handled. Use the router’s path-based API instead.
    router.dismissAll();
    queueMicrotask(() => {
      router.replace('/Onboarding');
    });
  };

  const performLogoutAndNavigate = async () => {
    try {
      await signOutGoogle();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      dispatch(setUserData(getEmptyUserData()));
      resetNavigationToOnboarding();
    }
  };

  const handleSignOutPress = () => {
    setShowSignOutModal(true);
    dispatch(setShowModalApp(true));
  };

  const confirmSignOut = () => {
    void performLogoutAndNavigate();
  };

  const confirmDeleteAccount = async () => {
    try {
      const deleteUrl = `${remote_url}/payall/API/delete_account`;
      await axios.post(deleteUrl, {
        user_id: userData?._id,
        requested_by: userData?._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // After successful deletion, sign out locally
      await performLogoutAndNavigate();
    } catch (error: any) {
      console.error('Delete account error:', error);
      Alert.alert(t('settings.deleteAccountErrorTitle'), t('settings.deleteAccountError'));
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    dispatch(setShowModalApp(true));
  };

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom + 10 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <AppText 
            i18nKey="settings.profile"
            size="big"
            bold
            styles={styles.sectionTitle}
          />
          <View style={[styles.profileCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <View style={styles.profileInfo}>
              <View style={[styles.avatar, { backgroundColor: themeColors.primary }]}>
                <AppText 
                  text={userData.names.charAt(0).toUpperCase() || 'U'}
                  size="big"
                  bold
                  styles={{ color: themeColors.primaryForeground }}
                />
              </View>
              <View style={styles.profileDetails}>
                <AppText 
                  text={userData.names || 'User'}
                  size="medium"
                  bold
                />
                <AppText 
                  i18nKey={isDriver ? "settings.driver" : "settings.customer"}
                  size="small"
                  styles={{ color: themeColors.gray, marginTop: 4 }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <AppText 
            i18nKey="settings.preferences"
            size="big"
            bold
            styles={styles.sectionTitle}
          />
          
          {/* Theme Toggle */}
          <Pressable 
            style={({ pressed }) => [
              styles.settingItem, 
              { 
                backgroundColor: themeColors.background, 
                borderColor: themeColors.border,
                opacity: pressed ? 0.7 : 1
              }
            ]}
            onPress={() => dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))}
          >
            <View style={styles.settingLeft}>
              <IconApp 
                pack="FI" 
                name={theme === 'dark' ? "sun" : "moon"} 
                size={24} 
                color={themeColors.text} 
                styles={{ marginRight: 15 }}
              />
              <AppText 
                i18nKey="settings.theme"
                size="normal"
              />
            </View>
            <AppText 
              i18nKey={theme === 'light' ? 'settings.lightTheme' : 'settings.darkTheme'}
              size="small"
              styles={{ color: themeColors.gray }}
            />
          </Pressable>

          {/* Language Toggle */}
          <Pressable 
            style={({ pressed }) => [
              styles.settingItem, 
              { 
                backgroundColor: themeColors.background, 
                borderColor: themeColors.border,
                opacity: pressed ? 0.7 : 1
              }
            ]}
            onPress={() => {
              const newLanguage = currentLanguage === LangCode.en ? LangCode.fr : LangCode.en;
              i18n.changeLanguage(newLanguage);
              dispatch(setLanguage(newLanguage));
            }}
          >
            <View style={styles.settingLeft}>
              <IconApp 
                pack="FI" 
                name="globe" 
                size={24} 
                color={themeColors.text} 
                styles={{ marginRight: 15 }}
              />
              <AppText 
                i18nKey="settings.language"
                size="normal"
              />
            </View>
            <AppText 
              i18nKey={currentLanguage === LangCode.en ? 'settings.english' : 'settings.french'}
              size="small"
              styles={{ color: themeColors.gray }}
            />
          </Pressable>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <AppText 
            i18nKey="settings.account"
            size="big"
            bold
            styles={styles.sectionTitle}
          />
          
          {/* Edit Profile */}
          <Pressable 
            style={({ pressed }) => [
              styles.settingItem, 
              { 
                backgroundColor: themeColors.background, 
                borderColor: themeColors.border,
                opacity: pressed ? 0.7 : 1
              }
            ]}
            onPress={() => router.push('/UpdateUser')}
          >
            <View style={styles.settingLeft}>
              <IconApp 
                pack="FI" 
                name="user" 
                size={24} 
                color={themeColors.text} 
                styles={{ marginRight: 15 }}
              />
              <AppText 
                i18nKey="settings.editProfile"
                size="normal"
              />
            </View>
            <IconApp 
              pack="FI" 
              name="chevron-right" 
              size={20} 
              color={themeColors.gray} 
              styles={{}}
            />
          </Pressable>
          
          {isDriver && (
            <Pressable 
              style={({ pressed }) => [
                styles.settingItem, 
                { 
                  backgroundColor: themeColors.background, 
                  borderColor: themeColors.border,
                  opacity: pressed ? 0.7 : 1
                }
              ]}
              onPress={() => router.push('/Rides')}
            >
              <View style={styles.settingLeft}>
                <IconApp 
                  pack="FI" 
                  name="navigation" 
                  size={24} 
                  color={themeColors.text} 
                  styles={{ marginRight: 15 }}
                />
                <AppText 
                  i18nKey="settings.viewRideOrders"
                  size="normal"
                />
              </View>
              <IconApp 
                pack="FI" 
                name="chevron-right" 
                size={20} 
                color={themeColors.gray} 
                styles={{}}
              />
            </Pressable>
          )}

          {isDriver && (
            <Pressable 
              style={({ pressed }) => [
                styles.settingItem, 
                { 
                  backgroundColor: themeColors.background, 
                  borderColor: themeColors.border,
                  opacity: pressed ? 0.7 : 1
                }
              ]}
              onPress={() => router.push('/DriverRates')}
            >
              <View style={styles.settingLeft}>
                <IconApp 
                  pack="FI" 
                  name="star" 
                  size={24} 
                  color={themeColors.text} 
                  styles={{ marginRight: 15 }}
                />
                <AppText 
                  i18nKey="settings.viewRates"
                  size="normal"
                />
              </View>
              <IconApp 
                pack="FI" 
                name="chevron-right" 
                size={20} 
                color={themeColors.gray} 
                styles={{}}
              />
            </Pressable>
          )}

          {/* Fidelity Points */}
          <Pressable 
            style={({ pressed }) => [
              styles.settingItem, 
              { 
                backgroundColor: themeColors.background, 
                borderColor: themeColors.border,
                opacity: pressed ? 0.7 : 1
              }
            ]}
            onPress={() => router.push('/FidelityPoints')}
          >
            <View style={styles.settingLeft}>
              <IconApp 
                pack="FI" 
                name="award" 
                size={24} 
                color={themeColors.text} 
                styles={{ marginRight: 15 }}
              />
              <AppText 
                i18nKey="settings.fidelityPoints"
                size="normal"
              />
            </View>
            <IconApp 
              pack="FI" 
              name="chevron-right" 
              size={20} 
              color={themeColors.gray} 
              styles={{}}
            />
          </Pressable>

          {/* Delete Account */}
          <Pressable 
            style={({ pressed }) => [
              styles.settingItem, 
              { 
                backgroundColor: themeColors.background, 
                borderColor: themeColors.border,
                opacity: pressed ? 0.7 : 1
              }
            ]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <IconApp 
                pack="FI" 
                name="trash-2" 
                size={24} 
                color={themeColors.error || '#FF3B30'} 
                styles={{ marginRight: 15 }}
              />
              <AppText 
                i18nKey="settings.deleteAccountLabel"
                size="normal"
                styles={{ color: themeColors.error || '#FF3B30' }}
              />
            </View>
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <View style={styles.section}>
          <AppButton
            i18nKey="settings.signOut"
            onPress={handleSignOutPress}
            styles={styles.signOutButton}
          />
        </View>
      </ScrollView>

      {showSignOutModal && (
        <ModalApp
          titleKey="settings.signOutTitle"
          descriptionKey="settings.signOutMessage"
          textActionKey="settings.signOutConfirm"
          textCancelKey="close"
          singleButton={false}
          onAction={confirmSignOut}
          onCancel={() => setShowSignOutModal(false)}
          onClose={() => setShowSignOutModal(false)}
        >
          <View />
        </ModalApp>
      )}

      {showDeleteModal && (
        <ModalApp
          titleKey="settings.deleteAccountTitle"
          descriptionKey="settings.deleteAccountMessage"
          textActionKey="settings.deleteAccountConfirm"
          textCancelKey="close"
          singleButton={false}
          onAction={confirmDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          onClose={() => setShowDeleteModal(false)}
        >
          <View />
        </ModalApp>
      )}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  profileCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileDetails: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  signOutButton: {
    marginTop: 10,
  },
});

