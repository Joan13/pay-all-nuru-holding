import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { TRide } from '@/src/Types';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Rides() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [rides, setRides] = useState<TRide[]>([]);
  const [filteredRides, setFilteredRides] = useState<TRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCity, setUserCity] = useState<string>('');
  const [modalError, setModalError] = useState<{ titleKey: string; descriptionKey: string } | null>(null);
  const [searchBarHeight, setSearchBarHeight] = useState(52);

  useEffect(() => {
    navigation.setOptions({
      title: t('rides.title'),
      ...(Platform.OS === 'ios' ? { headerBackTitle: 'Back' } : {}),
    });
  }, [navigation, t]);

  useEffect(() => {
    if (isDriver && !isAdmin) {
      getCurrentCity();
    }
    fetchRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, rides]);

  const getCurrentCity = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserCity(userData?.city || '');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        setUserCity(addresses[0].city || userData?.city || '');
      } else {
        setUserCity(userData?.city || '');
      }
    } catch {
      setUserCity(userData?.city || '');
      setModalError({
        titleKey: 'error.locationError',
        descriptionKey: 'error.locationErrorDescription',
      });
      dispatch(setShowModalApp(true));
    }
  };

  const isDriver = userData?.account_type === 1;
  const isAdmin = userData?.account_type === 2 || userData?.is_admin === true;

  const fetchRides = async () => {
    if (!userData || !userData._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // For admins: fetch all rides
      // For drivers: fetch available rides in city (not completed)
      // For regular users: this page shouldn't be accessible, but if it is, show empty
      if (isAdmin) {
        // Fetch all rides for admin
        const getAdminDataUrl = `${remote_url}/payall/API/get_admin_data`;
        const apiResponse = await axios.post(getAdminDataUrl, {
          user_id: userData._id,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.rides) {
          setRides(apiResponse.data.rides);
        } else {
          setRides([]);
          setModalError({
            titleKey: 'error.fetchRidesError',
            descriptionKey: apiResponse.data?.error || 'error.fetchRidesErrorDescriptionGeneric',
          });
          dispatch(setShowModalApp(true));
        }
      } else if (isDriver) {
        // Fetch available rides in the driver's current city
        const getRidesUrl = `${remote_url}/payall/API/get_rides`;
        const apiResponse = await axios.post(getRidesUrl, {
          user_id: userData._id,
          city: userCity,
          available_only: true, // Only get rides that are not completed
          driver_view: true, // Indicate this is for driver view
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.rides) {
          // Filter to only show rides that are not completed (status 0, 1, or 2)
          const availableRides = apiResponse.data.rides.filter((ride: TRide) => 
            ride.ride_status !== 3 && ride.ride_status !== 4
          );
          setRides(availableRides);
        } else {
          setRides([]);
          setModalError({
            titleKey: 'error.fetchRidesError',
            descriptionKey: apiResponse.data?.error || 'error.fetchRidesErrorDescriptionGeneric',
          });
          dispatch(setShowModalApp(true));
        }
      } else {
        setRides([]);
        setLoading(false);
        return;
      }
    } catch (error: any) {
      setRides([]);
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
    await fetchRides();
    setRefreshing(false);
  };

  const filterRides = () => {
    if (!searchQuery.trim()) {
      setFilteredRides(rides);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rides.filter(ride =>
      ride.start_location.toLowerCase().includes(query) ||
      ride.end_location.toLowerCase().includes(query) ||
      ride.user_id.toLowerCase().includes(query)
    );
    setFilteredRides(filtered);
  };

  const handleAcceptRide = (ride: TRide) => {
    // TODO: Implement accept ride functionality
    console.log('Accept ride:', ride._id);
  };

  const getRideStatusColor = (status: number): string => {
    switch (status) {
      case 0: return themeColors.primary; // Pending
      case 1: return '#4CAF50'; // Accepted
      case 2: return '#2196F3'; // In Progress
      case 3: return themeColors.gray; // Completed
      case 4: return themeColors.error || '#FF3B30'; // Cancelled
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

  const formatCurrency = (amount: number, currency: number): string => {
    // TODO: Implement proper currency formatting
    return `${amount} FC`;
  };

  if (loading) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText
            text={t('loading')}
            size="medium"
            styles={{ color: themeColors.gray, marginTop: 12 }}
          />
        </View>
      </AppView>
    );
  }

  const renderRideItem = ({ item: ride, index }: { item: TRide; index: number }) => (
    <Pressable
      onPress={() => {
        router.push({ pathname: '/Ride', params: { rideId: ride._id } } as any);
      }}
        style={({ pressed }) => [
          styles.rideCard,
          {
            backgroundColor: theme === 'light' 
              ? 'rgba(255, 255, 255, 0.95)' 
              : 'rgba(0, 0, 0, 0.85)',
            borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
      <BlurView
        intensity={80}
        tint={theme === 'light' ? 'light' : 'dark'}
        style={styles.rideCardContent}
      >
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: getRideStatusColor(ride.ride_status) + '15' },
        ]}>
          <AppText
            text={getRideStatusText(ride.ride_status)}
            size="normal"
            bold
            styles={{ color: getRideStatusColor(ride.ride_status) }}
          />
        </View>

        {/* Locations */}
        <View style={styles.locationRow}>
          <View style={[styles.locationIndicator, { backgroundColor: themeColors.primary }]} />
          <View style={styles.locationContent}>
            <AppText
              i18nKey="home.from"
              size="normal"
              bold
              styles={{ color: themeColors.gray, marginBottom: 4 }}
            />
            <AppText
              text={ride.start_location}
              size="normal"
              styles={{ color: themeColors.text }}
              numberLines={2}
            />
          </View>
        </View>

        {ride.stops && ride.stops.length > 0 && (
          <>
            {ride.stops.map((stop, stopIndex) => (
              <View key={`stop-${stopIndex}`} style={styles.locationRow}>
                <View style={[styles.locationIndicator, { backgroundColor: '#FFA500' }]} />
                <View style={styles.locationContent}>
                  <AppText
                    text={`${t('home.stop')} ${stopIndex + 1}`}
                    size="normal"
                    bold
                    styles={{ color: themeColors.gray, marginBottom: 4 }}
                  />
                  <AppText
                    text={stop.address}
                    size="normal"
                    styles={{ color: themeColors.text }}
                    numberLines={2}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.locationRow}>
          <View style={[styles.locationIndicator, { backgroundColor: themeColors.error || '#FF3B30' }]} />
          <View style={styles.locationContent}>
            <AppText
              i18nKey="home.to"
              size="normal"
              bold
              styles={{ color: themeColors.gray, marginBottom: 4 }}
            />
            <AppText
              text={ride.end_location}
              size="normal"
              styles={{ color: themeColors.text }}
              numberLines={2}
            />
          </View>
        </View>

        {/* Ride Info */}
        <View style={[styles.rideInfoRow, { borderTopColor: themeColors.border }]}>
          <View style={styles.rideInfoItem}>
            <IconApp
              pack="FI"
              name="map"
              size={14}
              color={themeColors.gray}
              styles={{ marginRight: 6 }}
            />
            <AppText
              text={`${ride.distance.toFixed(1)} ${t('home.km')}`}
              size="normal"
              styles={{ color: themeColors.gray }}
            />
          </View>
          <View style={styles.rideInfoItem}>
            <IconApp
              pack="FI"
              name="clock"
              size={14}
              color={themeColors.gray}
              styles={{ marginRight: 6 }}
            />
            <AppText
              text={`${ride.estimated_duration} ${t('home.minutes')}`}
              size="normal"
              styles={{ color: themeColors.gray }}
            />
          </View>
          <View style={styles.rideInfoItem}>
            <IconApp
              pack="FI"
              name="dollar-sign"
              size={14}
              color={themeColors.primary}
              styles={{ marginRight: 6 }}
            />
            <AppText
              text={formatCurrency(ride.ride_price, ride.ride_currency)}
              size="normal"
              bold
              styles={{ color: themeColors.primary }}
            />
          </View>
        </View>

        {/* Accept Button */}
        {ride.ride_status === 0 && !isAdmin && (
          <Pressable
            onPress={() => handleAcceptRide(ride)}
            style={({ pressed }) => [
              styles.acceptButton, 
              { 
                backgroundColor: themeColors.primary,
                opacity: pressed ? 0.7 : 1,
              }
            ]}
          >
            <AppText
              i18nKey="rides.acceptRide"
              size="medium"
              bold
              color="primaryForeground"
              styles={{ color: '#FFFFFF' }}
            />
          </Pressable>
        )}
      </BlurView>
    </Pressable>
  );

  const showSearch = rides.length > 0;
  const SEARCH_BAR_TOP = 15;
  const GAP_BELOW_SEARCH = 10;
  const listPaddingTop = showSearch
    ? SEARCH_BAR_TOP + searchBarHeight + GAP_BELOW_SEARCH
    : 20 + insets.top;

  const renderListHeader = () => (
    <>
      {/* City Info */}
      {userCity && isDriver && !isAdmin && (
        <View style={[
          styles.cityBadge,
          {
            backgroundColor: theme === 'light' 
              ? 'rgba(0, 0, 0, 0.05)' 
              : 'rgba(255, 255, 255, 0.1)',
          },
        ]}>
          <IconApp
            pack="FI"
            name="map-pin"
            size={16}
            color={themeColors.primary}
            styles={{ marginRight: 8 }}
          />
          <AppText
            text={`${t('rides.showingRidesIn')} ${userCity}`}
            size="small"
            styles={{ color: themeColors.text }}
          />
        </View>
      )}
    </>
  );

  const renderListEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconApp
        pack="FI"
        name="inbox"
        size={64}
        color={themeColors.gray}
        styles={{ marginBottom: 16 }}
      />
      <AppText
        i18nKey="rides.noRidesAvailable"
        size="medium"
        styles={{ color: themeColors.gray, textAlign: 'center', marginBottom: 20 }}
      />
      <AppButton
        i18nKey="retry"
        onPress={onRefresh}
        styles={{ width: 120 }}
      />
    </View>
  );

  return (
    <AppView style={styles.container}>
      <StatusBarApp />

      {/* Floating Search Bar - show when there is at least one ride */}
      {showSearch && (
        <AppView
          onLayout={(e) => setSearchBarHeight(e.nativeEvent.layout.height)}
          style={[
          styles.searchContainer,
          {
            top: SEARCH_BAR_TOP,
            backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
            borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)',
          }
        ]}
        >
          <IconApp 
            pack="FI" 
            name="search" 
            size={16} 
            color={themeColors.gray} 
            styles={{ marginRight: 12 }} 
          />
          <TextInput
            placeholder={t('rides.searchPlaceholder')}
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

      <FlashList
        data={filteredRides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 20 + insets.bottom,
            paddingTop: listPaddingTop,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      />

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 15,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  rideCard: {
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
  rideCardContent: {
    padding: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  locationContent: {
    flex: 1,
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  rideInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

