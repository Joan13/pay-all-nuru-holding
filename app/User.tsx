import IconApp from '@/src/components/app/IconApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { TUserData } from '@/src/Types';
import axios from 'axios';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function User() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [user, setUser] = useState<TUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = params.userId as string;

  useEffect(() => {
    navigation.setOptions({
      title: t('admin.userDetails') || 'User Details',
    });
  }, [navigation, t]);

  const fetchUser = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      
      const getUserUrl = `${remote_url}/payall/API/get_user`;
      const apiResponse = await axios.post(getUserUrl, {
        user_id: userId,
        requested_by: userData?._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
        setUser(apiResponse.data.user as TUserData);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId, userData?._id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUser(true);
    setRefreshing(false);
  }, [fetchUser]);

  useEffect(() => {
    if (userId && userData?._id) {
      fetchUser();
    }
  }, [userId, userData?._id, fetchUser]);

  const handleCall = async (phoneNumber: string) => {
    if (!phoneNumber) return;
    const phoneUrl = `tel:${phoneNumber.replace(/[^\d+]/g, '')}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      }
    } catch (error) {
      console.error('Error opening phone:', error);
    }
  };

  const getAccountTypeText = (accountType: number): string => {
    switch (accountType) {
      case 0: return t('settings.customer');
      case 1: return t('settings.driver');
      case 2: return t('admin.admin');
      default: return t('admin.unknown');
    }
  };

  const getGenderText = (gender: number): string => {
    switch (gender) {
      case 0: return t('updateUser.male');
      case 1: return t('updateUser.female');
      default: return '-';
    }
  };

  const getCarConditionText = (condition?: number): string => {
    if (condition === undefined) return '-';
    switch (condition) {
      case 0: return t('updateUser.excellent');
      case 1: return t('updateUser.good');
      case 2: return t('updateUser.poor');
      default: return '-';
    }
  };

  if (loading) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText
            text={t('loading') || 'Loading...'}
            size="small"
            styles={{ marginTop: 12, color: themeColors.gray }}
          />
        </View>
      </AppView>
    );
  }

  if (!user) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.emptyContainer}>
          <AppText
            text={t('admin.userNotFound') || 'User not found'}
            size="medium"
            styles={{ color: themeColors.gray, textAlign: 'center' }}
          />
        </View>
      </AppView>
    );
  }

  const isDriver = user.account_type === 1;

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Basic Information */}
        <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
          <AppText size="normal" bold text={t('updateUser.title') || 'Profile'} styles={{ marginBottom: 12, color: themeColors.text }} />
          
          <View style={styles.infoRow}>
            <AppText size="small" text={t('updateUser.names') || 'Full Name'} styles={styles.label} />
            <AppText size="normal" text={user.names} styles={{ color: themeColors.text }} />
          </View>

          <View style={styles.infoRow}>
            <AppText size="small" text={t('updateUser.gender') || 'Gender'} styles={styles.label} />
            <AppText size="normal" text={getGenderText(user.gender)} styles={{ color: themeColors.text }} />
          </View>

          <View style={styles.infoRow}>
            <AppText size="small" text={t('admin.accountType') || 'Account Type'} styles={styles.label} />
            <View style={[styles.accountTypeBadge, { backgroundColor: themeColors.primary + '15' }]}>
              <AppText size="small" bold text={getAccountTypeText(user.account_type)} styles={{ color: themeColors.primary }} />
            </View>
          </View>

          {user.user_email && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.emails') || 'Email'} styles={styles.label} />
              <AppText size="normal" text={user.user_email} styles={{ color: themeColors.text }} />
            </View>
          )}

          {user.user_emails && user.user_emails.length > 1 && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.emails') || 'Additional Emails'} styles={styles.label} />
              <View>
                {user.user_emails.slice(1).map((email, index) => (
                  <AppText key={index} size="normal" text={email} styles={{ color: themeColors.text, marginBottom: 4 }} />
                ))}
              </View>
            </View>
          )}

          {user.phone_numbers && user.phone_numbers.length > 0 && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.phoneNumbers') || 'Phone Numbers'} styles={styles.label} />
              <View>
                {user.phone_numbers.map((phone, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleCall(phone)}
                    style={({ pressed }) => [
                      styles.phoneRow,
                      { opacity: pressed ? 0.7 : 1 }
                    ]}
                  >
                    <IconApp pack="FI" name="phone" size={16} color={themeColors.primary} styles={{ marginRight: 8 }} />
                    <AppText size="normal" text={phone} styles={{ color: themeColors.text }} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {user.address && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.address') || 'Address'} styles={styles.label} />
              <AppText size="normal" text={user.address} styles={{ color: themeColors.text }} />
            </View>
          )}

          {user.city && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.city') || 'City'} styles={styles.label} />
              <AppText size="normal" text={user.city} styles={{ color: themeColors.text }} />
            </View>
          )}

          {user.state && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.state') || 'State'} styles={styles.label} />
              <AppText size="normal" text={user.state} styles={{ color: themeColors.text }} />
            </View>
          )}

          {user.country && (
            <View style={styles.infoRow}>
              <AppText size="small" text={t('updateUser.country') || 'Country'} styles={styles.label} />
              <AppText size="normal" text={user.country} styles={{ color: themeColors.text }} />
            </View>
          )}
        </View>

        {/* Car Information (for drivers) */}
        {isDriver && (
          <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
            <AppText size="normal" bold text={t('updateUser.carInformation') || 'Car Information'} styles={{ marginBottom: 12, color: themeColors.text }} />
            
            {user.car_model && (
              <View style={styles.infoRow}>
                <AppText size="small" text={t('updateUser.carModel') || 'Car Model'} styles={styles.label} />
                <AppText size="normal" text={user.car_model} styles={{ color: themeColors.text }} />
              </View>
            )}

            {user.car_condition !== undefined && (
              <View style={styles.infoRow}>
                <AppText size="small" text={t('updateUser.carCondition') || 'Car Condition'} styles={styles.label} />
                <AppText size="normal" text={getCarConditionText(user.car_condition)} styles={{ color: themeColors.text }} />
              </View>
            )}

            {user.license_plate && (
              <View style={styles.infoRow}>
                <AppText size="small" text={t('updateUser.licensePlate') || 'License Plate'} styles={styles.label} />
                <AppText size="normal" text={user.license_plate} styles={{ color: themeColors.text }} />
              </View>
            )}
          </View>
        )}

        {/* Edit Button */}
        <Pressable
          onPress={() => {
            router.push({ pathname: '/UpdateUser', params: { userId: user._id } } as any);
          }}
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: themeColors.primary,
              opacity: pressed ? 0.7 : 1,
            }
          ]}
        >
          <IconApp pack="FI" name="edit-2" size={18} color="#FFFFFF" styles={{ marginRight: 8 }} />
          <AppText size="normal" bold text={t('updateUser.title') || 'Edit Profile'} styles={{ color: '#FFFFFF' }} />
        </Pressable>
      </ScrollView>
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    opacity: 0.65,
    marginBottom: 4,
    fontWeight: '600',
  },
  accountTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
});

