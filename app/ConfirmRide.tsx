import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface RideData {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  stops: LocationData[];
  routeDistance: number | null;
  routeDuration: number | null;
  rideTimeNow: boolean;
  selectedRideDateTime: Date | null;
}

export default function ConfirmRide() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [rideType, setRideType] = useState<'standard' | 'vip'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<{ titleKey: string; descriptionKey: string } | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: t('confirmRide.title'),
    });
  }, [navigation, t]);

  // Parse ride data from params
  const rideData: RideData = params.rideData 
    ? JSON.parse(params.rideData as string)
    : {
        fromLocation: null,
        toLocation: null,
        stops: [],
        routeDistance: null,
        routeDuration: null,
        rideTimeNow: true,
        selectedRideDateTime: null,
      };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? t('home.minute') : t('home.minutes')}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? t('home.hour') : t('home.hours')}`;
    }
    return `${hours} ${hours === 1 ? t('home.hour') : t('home.hours')} ${remainingMinutes} ${remainingMinutes === 1 ? t('home.minute') : t('home.minutes')}`;
  };

  const isManualLocation = (location: LocationData | null): boolean => {
    return location !== null && location.latitude === 0 && location.longitude === 0;
  };

  const calculateRidePrice = (distance: number | null): number => {
    // Simple pricing: 1000 FC per km (adjust as needed)
    if (!distance || distance === 0) return 0;
    return Math.round(distance * 1000);
  };

  const handleConfirmPayment = async () => {
    if (!paymentMethod) return;
    if (!userData || !userData._id) {
      setModalError({
        titleKey: 'error.signInError',
        descriptionKey: 'confirmRide.userNotLoggedIn',
      });
      dispatch(setShowModalApp(true));
      return;
    }
    
    setIsProcessing(true);
    setModalError(null);

    try {
      // Prepare ride data for API
      const rideTime = rideData.rideTimeNow 
        ? new Date().toISOString()
        : rideData.selectedRideDateTime
          ? new Date(rideData.selectedRideDateTime).toISOString()
          : new Date().toISOString();

      // Map ride type: 'standard' = 0, 'vip' = 1
      const rideTypeNumber = rideType === 'standard' ? 0 : 1;
      
      // Map payment method: 'cash' = 0, 'online' = 1
      const paymentMethodNumber = paymentMethod === 'cash' ? 0 : 1;

      // Calculate price if distance is available
      const ridePrice = rideData.routeDistance 
        ? calculateRidePrice(rideData.routeDistance)
        : 0;

      // Ensure locations are not null (already checked at component level, but TypeScript needs this)
      if (!rideData.fromLocation || !rideData.toLocation) {
        setIsProcessing(false);
        setModalError({
          titleKey: 'error.signInError',
          descriptionKey: 'confirmRide.invalidRide',
        });
        dispatch(setShowModalApp(true));
        return;
      }

      const ridePayload = {
        ride: {
          user_id: userData._id,
          driver_id: '', // Empty for new rides, will be assigned when driver accepts
          start_location: rideData.fromLocation.address,
          end_location: rideData.toLocation.address,
          stops: rideData.stops.map(stop => ({
            address: stop.address,
            latitude: stop.latitude,
            longitude: stop.longitude,
          })),
          start_time: rideTime,
          end_time: null, // Will be set when ride is completed
          distance: rideData.routeDistance || 0,
          city: userData.city || 'Unknown', // Required field
          estimated_duration: rideData.routeDuration || 0, // in minutes
          ride_status: 0, // 0 = pending, 1 = accepted, 2 = in progress, 3 = completed, 4 = cancelled
          ride_type: rideTypeNumber, // 0 = standard, 1 = VIP
          ride_price: ridePrice,
          ride_currency: 0, // 0 = FC (Franc Congolais), adjust as needed
          ride_payment_method: paymentMethodNumber,
          ride_payment_status: 0, // 0 = unpaid, 1 = paid
          ride_payment_date: null, // Will be set when payment is completed
          ride_payment_amount: ridePrice,
          ride_payment_currency: 0, // 0 = FC
        },
      };

      // Call AddRide API
      const addRideUrl = `${remote_url}/payall/API/add_ride`;
      const apiResponse = await axios.post(addRideUrl, ridePayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.ride) {
        // Ride created successfully
        setIsProcessing(false);
        setModalError({
          titleKey: 'confirmRide.rideCreatedSuccess',
          descriptionKey: 'confirmRide.rideCreatedSuccessDescription',
        });
        dispatch(setShowModalApp(true));
        // Navigate back to home after showing success message
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else {
        // API returned an error
        setIsProcessing(false);
        setModalError({
          titleKey: 'error.signInError',
          descriptionKey: apiResponse.data?.error || 'confirmRide.rideCreationFailed',
        });
        dispatch(setShowModalApp(true));
      }
    } catch (apiError: any) {
      // Handle API errors
      setIsProcessing(false);
      console.error('Add Ride API Error:', apiError);
      if (apiError.response) {
        console.error('API Error Response:', apiError.response.data);
        console.error('API Error Status:', apiError.response.status);
        setModalError({
          titleKey: 'error.signInError',
          descriptionKey: apiError.response.data?.error || apiError.message || 'confirmRide.rideCreationFailed',
        });
      } else {
        setModalError({
          titleKey: 'error.signInError',
          descriptionKey: apiError.message || 'confirmRide.rideCreationFailed',
        });
      }
      dispatch(setShowModalApp(true));
    }
  };

  if (!rideData.fromLocation || !rideData.toLocation) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.errorContainer}>
          <AppText
            text={t('confirmRide.invalidRide')}
            size="medium"
            styles={{ color: themeColors.error || '#FF3B30', textAlign: 'center' }}
          />
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: themeColors.primary }]}
          >
            <AppText
              text={t('close')}
              size="medium"
              bold
              color="primaryForeground"
              styles={{ color: '#FFFFFF' }}
            />
          </TouchableOpacity>
        </View>
      </AppView>
    );
  }

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
        {/* Ride Details Card */}
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          style={[
            styles.card,
            {
              backgroundColor: theme === 'light' 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'rgba(0, 0, 0, 0.85)',
              borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={styles.cardContent}
          >
            <AppText
              i18nKey="confirmRide.rideDetails"
              size="medium"
              bold
              styles={{ color: themeColors.text, marginBottom: 16 }}
            />

            {/* From Location */}
            <View style={styles.locationRow}>
              <View style={[styles.locationIndicator, { backgroundColor: themeColors.primary }]} />
              <View style={styles.locationContent}>
                <AppText
                  i18nKey="home.from"
                  size="small"
                  bold
                  styles={{ color: themeColors.gray, marginBottom: 4 }}
                />
                <AppText
                  text={rideData.fromLocation.address}
                  size="small"
                  styles={{ color: themeColors.text }}
                  numberLines={2}
                />
              </View>
            </View>

            {/* Stops */}
            {rideData.stops.map((stop, index) => (
              <View key={`stop-${index}`} style={styles.locationRow}>
                <View style={[styles.locationIndicator, { backgroundColor: '#FFA500' }]} />
                <View style={styles.locationContent}>
                  <AppText
                    text={`${t('home.stop')} ${index + 1}`}
                    size="small"
                    bold
                    styles={{ color: themeColors.gray, marginBottom: 4 }}
                  />
                  <AppText
                    text={stop.address}
                    size="small"
                    styles={{ color: themeColors.text }}
                    numberLines={2}
                  />
                </View>
              </View>
            ))}

            {/* To Location */}
            <View style={styles.locationRow}>
              <View style={[styles.locationIndicator, { backgroundColor: themeColors.error || '#FF3B30' }]} />
              <View style={styles.locationContent}>
                <AppText
                  i18nKey="home.to"
                  size="small"
                  bold
                  styles={{ color: themeColors.gray, marginBottom: 4 }}
                />
                <AppText
                  text={rideData.toLocation.address}
                  size="small"
                  styles={{ color: themeColors.text }}
                  numberLines={2}
                />
              </View>
            </View>

            {/* Distance and Duration - Only for map-selected locations */}
            {!isManualLocation(rideData.fromLocation) && !isManualLocation(rideData.toLocation) && rideData.routeDistance !== null && (
              <>
                <View style={[styles.infoRow, { borderTopColor: themeColors.border, marginTop: 12, paddingTop: 12 }]}>
                  <IconApp
                    pack="FI"
                    name="map"
                    size={16}
                    color={themeColors.primary}
                    styles={{ marginRight: 8 }}
                  />
                  <AppText
                    i18nKey="home.distance"
                    size="small"
                    styles={{ color: themeColors.gray, marginRight: 4 }}
                  />
                  <AppText
                    text={`${rideData.routeDistance.toFixed(1)} ${t('home.km')}`}
                    size="small"
                    bold
                    styles={{ color: themeColors.primary }}
                  />
                </View>
                {rideData.routeDuration !== null && (
                  <View style={styles.infoRow}>
                    <IconApp
                      pack="FI"
                      name="clock"
                      size={16}
                      color={themeColors.primary}
                      styles={{ marginRight: 8 }}
                    />
                    <AppText
                      i18nKey="home.estimatedDuration"
                      size="small"
                      styles={{ color: themeColors.gray, marginRight: 4 }}
                    />
                    <AppText
                      text={formatDuration(rideData.routeDuration)}
                      size="small"
                      bold
                      styles={{ color: themeColors.primary }}
                    />
                  </View>
                )}
              </>
            )}

            {/* Ride Time */}
            <View style={[styles.infoRow, { borderTopColor: themeColors.border, marginTop: 12, paddingTop: 12 }]}>
              <IconApp
                pack="FI"
                name="calendar"
                size={16}
                color={themeColors.primary}
                styles={{ marginRight: 8 }}
              />
              <AppText
                i18nKey="home.rideTime"
                size="small"
                styles={{ color: themeColors.gray, marginRight: 4 }}
              />
              <AppText
                text={rideData.rideTimeNow 
                  ? t('home.now')
                  : rideData.selectedRideDateTime
                    ? `${new Date(rideData.selectedRideDateTime).toLocaleDateString()} ${new Date(rideData.selectedRideDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : t('home.now')
                }
                size="small"
                bold
                styles={{ color: themeColors.primary }}
              />
            </View>
          </BlurView>
        </Animated.View>

        {/* Ride Type Selection */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={[
            styles.card,
            {
              backgroundColor: theme === 'light' 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'rgba(0, 0, 0, 0.85)',
              borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={styles.cardContent}
          >
            <AppText
              i18nKey="confirmRide.rideType"
              size="medium"
              bold
              styles={{ color: themeColors.text, marginBottom: 16 }}
            />

            {/* Standard Ride */}
            <TouchableOpacity
              onPress={() => setRideType('standard')}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: rideType === 'standard' 
                    ? themeColors.primary + '15' 
                    : theme === 'light' 
                      ? 'rgba(0, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  borderColor: rideType === 'standard' 
                    ? themeColors.primary 
                    : themeColors.border,
                },
              ]}
            >
              <IconApp
                pack="FA"
                name="car"
                size={20}
                color={rideType === 'standard' ? themeColors.primary : themeColors.gray}
                styles={{ marginRight: 12 }}
              />
              <View style={styles.paymentOptionContent}>
                <AppText
                  i18nKey="confirmRide.standard"
                  size="medium"
                  bold
                  styles={{ color: rideType === 'standard' ? themeColors.primary : themeColors.text }}
                />
                <AppText
                  i18nKey="confirmRide.standardDescription"
                  size="small"
                  styles={{ color: themeColors.gray, marginTop: 4 }}
                />
              </View>
              {rideType === 'standard' && (
                <IconApp
                  pack="FI"
                  name="check"
                  size={20}
                  color={themeColors.primary}
                  styles={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>

            {/* VIP Ride */}
            <TouchableOpacity
              onPress={() => setRideType('vip')}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: rideType === 'vip' 
                    ? themeColors.primary + '15' 
                    : theme === 'light' 
                      ? 'rgba(0, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  borderColor: rideType === 'vip' 
                    ? themeColors.primary 
                    : themeColors.border,
                  marginTop: 12,
                },
              ]}
            >
              <IconApp
                pack="FI"
                name="star"
                size={20}
                color={rideType === 'vip' ? themeColors.primary : themeColors.gray}
                styles={{ marginRight: 12 }}
              />
              <View style={styles.paymentOptionContent}>
                <AppText
                  i18nKey="confirmRide.vip"
                  size="medium"
                  bold
                  styles={{ color: rideType === 'vip' ? themeColors.primary : themeColors.text }}
                />
                <AppText
                  i18nKey="confirmRide.vipDescription"
                  size="small"
                  styles={{ color: themeColors.gray, marginTop: 4 }}
                />
              </View>
              {rideType === 'vip' && (
                <IconApp
                  pack="FI"
                  name="check"
                  size={20}
                  color={themeColors.primary}
                  styles={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          </BlurView>
        </Animated.View>

        {/* Payment Method Selection */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={[
            styles.card,
            {
              backgroundColor: theme === 'light' 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'rgba(0, 0, 0, 0.85)',
              borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={styles.cardContent}
          >
            <AppText
              i18nKey="confirmRide.paymentMethod"
              size="medium"
              bold
              styles={{ color: themeColors.text, marginBottom: 16 }}
            />

            {/* Cash Payment */}
            <TouchableOpacity
              onPress={() => setPaymentMethod('cash')}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: paymentMethod === 'cash' 
                    ? themeColors.primary + '15' 
                    : theme === 'light' 
                      ? 'rgba(0, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  borderColor: paymentMethod === 'cash' 
                    ? themeColors.primary 
                    : themeColors.border,
                },
              ]}
            >
              <IconApp
                pack="FI"
                name="dollar-sign"
                size={20}
                color={paymentMethod === 'cash' ? themeColors.primary : themeColors.gray}
                styles={{ marginRight: 12 }}
              />
              <View style={styles.paymentOptionContent}>
                <AppText
                  i18nKey="confirmRide.cash"
                  size="medium"
                  bold
                  styles={{ color: paymentMethod === 'cash' ? themeColors.primary : themeColors.text }}
                />
                <AppText
                  i18nKey="confirmRide.cashDescription"
                  size="small"
                  styles={{ color: themeColors.gray, marginTop: 4 }}
                />
              </View>
              {paymentMethod === 'cash' && (
                <IconApp
                  pack="FI"
                  name="check"
                  size={20}
                  color={themeColors.primary}
                  styles={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>

            {/* Online Payment */}
            {/*<TouchableOpacity
              onPress={() => setPaymentMethod('online')}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: paymentMethod === 'online' 
                    ? themeColors.primary + '15' 
                    : theme === 'light' 
                      ? 'rgba(0, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  borderColor: paymentMethod === 'online' 
                    ? themeColors.primary 
                    : themeColors.border,
                  marginTop: 12,
                },
              ]}
            >
              <IconApp
                pack="FI"
                name="credit-card"
                size={20}
                color={paymentMethod === 'online' ? themeColors.primary : themeColors.gray}
                styles={{ marginRight: 12 }}
              />
              <View style={styles.paymentOptionContent}>
                <AppText
                  i18nKey="confirmRide.online"
                  size="medium"
                  bold
                  styles={{ color: paymentMethod === 'online' ? themeColors.primary : themeColors.text }}
                />
                <AppText
                  i18nKey="confirmRide.onlineDescription"
                  size="small"
                  styles={{ color: themeColors.gray, marginTop: 4 }}
                />
              </View>
              {paymentMethod === 'online' && (
                <IconApp
                  pack="FI"
                  name="check"
                  size={20}
                  color={themeColors.primary}
                  styles={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity> */}
          </BlurView>
        </Animated.View>

        {/* Confirm Button */}
        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          style={[styles.confirmButtonContainer, { marginTop: 20 }]}
        >
          <TouchableOpacity
            onPress={handleConfirmPayment}
            disabled={!paymentMethod || isProcessing}
            style={[
              styles.confirmButton,
              {
                backgroundColor: paymentMethod && !isProcessing
                  ? themeColors.primary
                  : themeColors.gray,
              },
            ]}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText
                text={paymentMethod === 'online' ? t('confirmRide.confirmAndPay') : t('confirmRide.confirm')}
                size="medium"
                bold
                color="primaryForeground"
                styles={{ color: '#FFFFFF' }}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
      {modalError && (
        <ModalApp
          titleKey={modalError.titleKey}
          descriptionKey={modalError.descriptionKey}
          singleButton={true}
          onClose={() => {
            setModalError(null);
            dispatch(setShowModalApp(false));
          }}
        >
          <></>
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
    paddingTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  paymentOptionContent: {
    flex: 1,
  },
  confirmButtonContainer: {
    marginBottom: 20,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

