import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { TRide, TUserData } from '@/src/Types';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Admin() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rides' | 'users'>('overview');
  const [rides, setRides] = useState<TRide[]>([]);
  const [users, setUsers] = useState<TUserData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState<{ titleKey: string; descriptionKey: string } | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: t('admin.title'),
    });
  }, [navigation, t]);

  useEffect(() => {
    // Redirect non-admin users
    if (!userData || userData?.is_admin !== true) {
      router.replace('/(tabs)/index' as any);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const fetchData = async () => {
    if (!userData || !userData._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const getAdminDataUrl = `${remote_url}/payall/API/get_admin_data`;
      const apiResponse = await axios.post(getAdminDataUrl, {
        user_id: userData._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1') {
        setRides(apiResponse.data.rides || []);
        setUsers(apiResponse.data.users || []);
        setStats(apiResponse.data.stats || null);
      } else {
        setModalError({
          titleKey: 'error',
          descriptionKey: apiResponse.data?.error || 'error.fetchRidesErrorDescriptionGeneric',
        });
        dispatch(setShowModalApp(true));
      }
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      if (error.response) {
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: error.response.data?.error || 'error.fetchRidesErrorDescriptionGeneric',
        });
      } else if (error.request) {
        setModalError({
          titleKey: 'error.networkError',
          descriptionKey: 'error.networkErrorDescription',
        });
      } else {
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: 'error.fetchRidesErrorDescriptionGeneric',
        });
      }
      dispatch(setShowModalApp(true));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getRideStatusColor = (status: number): string => {
    switch (status) {
      case 0: return themeColors.primary;
      case 1: return '#4CAF50';
      case 2: return '#2196F3';
      case 3: return themeColors.gray;
      case 4: return themeColors.error || '#FF3B30';
      default: return themeColors.gray;
    }
  };

  const getRideStatusText = (status: number): string => {
    switch (status) {
      case 0: return t('rides.pending');
      case 1: return t('rides.accepted');
      case 2: return t('rides.inProgress');
      case 3: return t('rides.completed');
      case 4: return t('rides.cancelled');
      default: return t('rides.unknown');
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

  const filteredRides = rides.filter(ride =>
    !searchQuery.trim() ||
    ride.start_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.end_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    !searchQuery.trim() ||
    user.names.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.phone_numbers && user.phone_numbers.some(phone => phone.includes(searchQuery)))
  );

  return (
    <AppView style={styles.container}>
      <StatusBarApp />

      {/* Floating Search Bar */}
      {(activeTab === 'rides' || activeTab === 'users') && (
        <AppView style={[
          styles.searchContainer,
          {
            top: 15,
            backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
            borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)',
          }
        ]}>
          <IconApp 
            pack="FI" 
            name="search" 
            size={16} 
            color={themeColors.gray} 
            styles={{ marginRight: 12 }} 
          />
          <TextInput
            placeholder={activeTab === 'rides' ? t('admin.searchRides') : t('admin.searchUsers')}
            placeholderTextColor={themeColors.gray}
            style={[
              styles.searchInput,
              {
                color: themeColors.text,
              }
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable 
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [
                styles.clearButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconApp 
                pack="FI" 
                name="x" 
                size={14} 
                color={themeColors.gray} 
                styles={{}} 
              />
            </Pressable>
          )}
        </AppView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingBottom: 20 + insets.bottom,
            paddingTop: (activeTab === 'rides' || activeTab === 'users') ? 50 + insets.top : 10,
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Tabs */}
        <View style={[
          styles.tabContainer,
          {
            backgroundColor: theme === 'light' 
              ? 'rgba(0, 0, 0, 0.05)' 
              : 'rgba(255, 255, 255, 0.1)',
          },
        ]}>
          <Pressable
            onPress={() => setActiveTab('overview')}
            style={({ pressed }) => [
              styles.tab,
              activeTab === 'overview' && {
                backgroundColor: themeColors.primary,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText
              i18nKey="admin.overview"
              size="small"
              bold
              styles={{
                color: activeTab === 'overview' ? '#FFFFFF' : themeColors.text,
              }}
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('rides')}
            style={({ pressed }) => [
              styles.tab,
              activeTab === 'rides' && {
                backgroundColor: themeColors.primary,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText
              i18nKey="admin.rides"
              size="small"
              bold
              styles={{
                color: activeTab === 'rides' ? '#FFFFFF' : themeColors.text,
              }}
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('users')}
            style={({ pressed }) => [
              styles.tab,
              activeTab === 'users' && {
                backgroundColor: themeColors.primary,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText
              i18nKey="admin.users"
              size="small"
              bold
              styles={{
                color: activeTab === 'users' ? '#FFFFFF' : themeColors.text,
              }}
            />
          </Pressable>
        </View>


        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <AppText
              text={t('loading')}
              size="medium"
              styles={{ color: themeColors.gray, marginTop: 12 }}
            />
          </View>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <View>
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                  <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme === 'light' 
                          ? 'rgba(255, 255, 255, 0.95)' 
                          : 'rgba(0, 0, 0, 0.85)',
                        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                      },
                    ]}
                  >
                    <BlurView intensity={80} tint={theme === 'light' ? 'light' : 'dark'} style={styles.statCardContent}>
                      <IconApp
                        pack="FI"
                        name="users"
                        size={24}
                        color={themeColors.primary}
                        styles={{ marginBottom: 8 }}
                      />
                      <AppText
                        text={(stats?.totalUsers || users.length).toString()}
                        size="big"
                        bold
                        styles={{ color: themeColors.text }}
                      />
                      <AppText
                        i18nKey="admin.totalUsers"
                        size="small"
                        styles={{ color: themeColors.gray, marginTop: 4 }}
                      />
                    </BlurView>
                  </Animated.View>

                  <Animated.View
                    entering={FadeInUp.delay(200).springify()}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme === 'light' 
                          ? 'rgba(255, 255, 255, 0.95)' 
                          : 'rgba(0, 0, 0, 0.85)',
                        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                      },
                    ]}
                  >
                    <BlurView intensity={80} tint={theme === 'light' ? 'light' : 'dark'} style={styles.statCardContent}>
                      <IconApp
                        pack="FI"
                        name="user-check"
                        size={24}
                        color={themeColors.primary}
                        styles={{ marginBottom: 8 }}
                      />
                      <AppText
                        text={(stats?.totalRides || rides.length).toString()}
                        size="big"
                        bold
                        styles={{ color: themeColors.text }}
                      />
                      <AppText
                        i18nKey="admin.totalRides"
                        size="small"
                        styles={{ color: themeColors.gray, marginTop: 4 }}
                      />
                    </BlurView>
                  </Animated.View>
                </View>

                <View style={styles.statsRow}>
                  <Animated.View
                    entering={FadeInUp.delay(300).springify()}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme === 'light' 
                          ? 'rgba(255, 255, 255, 0.95)' 
                          : 'rgba(0, 0, 0, 0.85)',
                        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                      },
                    ]}
                  >
                    <BlurView intensity={80} tint={theme === 'light' ? 'light' : 'dark'} style={styles.statCardContent}>
                      <IconApp
                        pack="FI"
                        name="user-check"
                        size={24}
                        color="#4CAF50"
                        styles={{ marginBottom: 8 }}
                      />
                      <AppText
                        text={(stats?.completedRides || rides.filter(r => r.ride_status === 3).length).toString()}
                        size="big"
                        bold
                        styles={{ color: themeColors.text }}
                      />
                      <AppText
                        i18nKey="admin.completedRides"
                        size="small"
                        styles={{ color: themeColors.gray, marginTop: 4 }}
                      />
                    </BlurView>
                  </Animated.View>

                  <Animated.View
                    entering={FadeInUp.delay(400).springify()}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: theme === 'light' 
                          ? 'rgba(255, 255, 255, 0.95)' 
                          : 'rgba(0, 0, 0, 0.85)',
                        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                      },
                    ]}
                  >
                    <BlurView intensity={80} tint={theme === 'light' ? 'light' : 'dark'} style={styles.statCardContent}>
                      <IconApp
                        pack="FI"
                        name="user"
                        size={24}
                        color={themeColors.primary}
                        styles={{ marginBottom: 8 }}
                      />
                      <AppText
                        text={(stats?.activeRides || rides.filter(r => r.ride_status === 0 || r.ride_status === 1 || r.ride_status === 2).length).toString()}
                        size="big"
                        bold
                        styles={{ color: themeColors.text }}
                      />
                      <AppText
                        i18nKey="admin.activeRides"
                        size="small"
                        styles={{ color: themeColors.gray, marginTop: 4 }}
                      />
                    </BlurView>
                  </Animated.View>
                </View>
              </View>
            )}

            {/* Rides Tab */}
            {activeTab === 'rides' && (
              <View>
                <Pressable
                  onPress={() => {
                    router.push('/Rides' as any);
                  }}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    {
                      backgroundColor: themeColors.primary,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <AppText
                    text={t('admin.viewAllRides') || 'View All Rides'}
                    size="normal"
                    bold
                    styles={{ color: '#FFFFFF' }}
                  />
                </Pressable>
                {filteredRides.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <IconApp
                      pack="FI"
                      name="inbox"
                      size={64}
                      color={themeColors.gray}
                      styles={{ marginBottom: 16 }}
                    />
                    <AppText
                      i18nKey="admin.noRides"
                      size="medium"
                      styles={{ color: themeColors.gray, textAlign: 'center' }}
                    />
                  </View>
                ) : (
                  filteredRides.slice(0, 10).map((ride, index) => (
                    <Pressable
                      key={ride._id}
                      onPress={() => {
                        router.push({ pathname: '/Ride', params: { rideId: ride._id } } as any);
                      }}
                      style={({ pressed }) => [
                        styles.card,
                        {
                          backgroundColor: theme === 'light' 
                            ? 'rgba(255, 255, 255, 0.95)' 
                            : 'rgba(0, 0, 0, 0.85)',
                          borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <BlurView intensity={80} tint={theme === 'light' ? 'light' : 'dark'} style={styles.cardContent}>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getRideStatusColor(ride.ride_status) + '15' },
                        ]}>
                          <AppText
                            text={getRideStatusText(ride.ride_status)}
                            size="small"
                            bold
                            styles={{ color: getRideStatusColor(ride.ride_status) }}
                          />
                        </View>
                        <AppText
                          text={`${t('home.from')}: ${ride.start_location}`}
                          size="small"
                          styles={{ color: themeColors.text, marginBottom: 4 }}
                        />
                        <AppText
                          text={`${t('home.to')}: ${ride.end_location}`}
                          size="small"
                          styles={{ color: themeColors.text, marginBottom: 8 }}
                        />
                        <View style={styles.infoRow}>
                          <AppText
                            text={`${ride.distance.toFixed(1)} ${t('home.km')}`}
                            size="small"
                            styles={{ color: themeColors.gray, marginRight: 16 }}
                          />
                          <AppText
                            text={`${ride.estimated_duration} ${t('home.minutes')}`}
                            size="small"
                            styles={{ color: themeColors.gray }}
                          />
                        </View>
                      </BlurView>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <View>
                <Pressable
                  onPress={() => {
                    router.push('/Users' as any);
                  }}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    {
                      backgroundColor: themeColors.primary,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <AppText
                    text={t('admin.viewAllUsers') || 'View All Users'}
                    size="normal"
                    bold
                    styles={{ color: '#FFFFFF' }}
                  />
                </Pressable>
                {filteredUsers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <IconApp
                      pack="FI"
                      name="users"
                      size={64}
                      color={themeColors.gray}
                      styles={{ marginBottom: 16 }}
                    />
                    <AppText
                      i18nKey="admin.noUsers"
                      size="medium"
                      styles={{ color: themeColors.gray, textAlign: 'center' }}
                    />
                  </View>
                ) : (
                  filteredUsers.slice(0, 10).map((user, index) => (
                    <Pressable
                      key={user._id}
                      onPress={() => {
                        router.push({ pathname: '/User', params: { userId: user._id } } as any);
                      }}
                      style={({ pressed }) => [
                        styles.card,
                        {
                          backgroundColor: theme === 'light' 
                            ? 'rgba(255, 255, 255, 0.95)' 
                            : 'rgba(0, 0, 0, 0.85)',
                          borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <BlurView intensity={80} tint={theme === 'light' ? 'light' : 'dark'} style={styles.cardContent}>
                        <AppText
                          text={user.names}
                          size="medium"
                          bold
                          styles={{ color: themeColors.text, marginBottom: 4 }}
                        />
                        <AppText
                          text={user.user_email}
                          size="small"
                          styles={{ color: themeColors.gray, marginBottom: 4 }}
                        />
                        {user.phone_numbers && user.phone_numbers.length > 0 && (
                          <AppText
                            text={user.phone_numbers.join(', ')}
                            size="small"
                            styles={{ color: themeColors.gray, marginBottom: 8 }}
                          />
                        )}
                        <View style={[
                          styles.accountTypeBadge,
                          { backgroundColor: themeColors.primary + '15' },
                        ]}>
                          <AppText
                            text={getAccountTypeText(user.account_type)}
                            size="small"
                            bold
                            styles={{ color: themeColors.primary }}
                          />
                        </View>
                      </BlurView>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  statCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  accountTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  viewAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
});

