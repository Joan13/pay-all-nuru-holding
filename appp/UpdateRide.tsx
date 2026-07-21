import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import SwitchApp from '@/src/components/app/SwitchApp';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { TRide } from '@/src/Types';
import axios from 'axios';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UpdateRide() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ rideId: string; mode: 'driver_accept' | 'client_confirm' | 'edit_ride' }>();
  const dispatch = useAppDispatch();

  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();

  const rideId = params.rideId;
  const mode = params.mode || 'driver_accept';

  const [ride, setRide] = useState<TRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isDriver = userData?.account_type === 1;
  const isRideOwner = !!ride && ride.user_id === userData?._id;

  const [modalConfig, setModalConfig] = useState<{
    title: string;
    description: string;
    onClose?: () => void;
  } | null>(null);

  const showModalAlert = (title: string, description: string, onClose?: () => void) => {
    setModalConfig({ title, description, onClose });
    dispatch(setShowModalApp(true));
  };

  // Form fields for driver_accept mode
  const [priceInput, setPriceInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState(0); // 0 = FC, 1 = USD

  // Form fields for edit_ride mode
  const [startLocInput, setStartLocInput] = useState('');
  const [endLocInput, setEndLocInput] = useState('');
  const [stopsInputs, setStopsInputs] = useState<{ address: string; latitude: number; longitude: number }[]>([]);
  const [withPackageInput, setWithPackageInput] = useState(0); // 0 or 1
  const [packageWeightInput, setPackageWeightInput] = useState('');
  const [packageDescriptionInput, setPackageDescriptionInput] = useState('');
  const [carpoolingInput, setCarpoolingInput] = useState(0); // 0 or 1

  useEffect(() => {
    navigation.setOptions({
      title: mode === 'driver_accept'
        ? (t('ride.driverAcceptTitle') || 'Accept Ride & Price')
        : mode === 'client_confirm'
          ? (t('ride.confirmRideTitle') || 'Confirm Ride')
          : (t('ride.editRideTitle') || 'Edit Ride Details'),
    });
  }, [navigation, mode, t]);

  const fetchRideDetails = useCallback(async (isRefresh = false) => {
    if (!rideId || !userData?._id) return;
    try {
      if (!isRefresh) setLoading(true);
      const getRidesUrl = `${remote_url}/payall/API/get_rides`;
      const apiResponse = await axios.post(getRidesUrl, {
        user_id: userData._id,
        ride_id: rideId,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.rides) {
        const foundRide = apiResponse.data.rides.find((r: TRide) => r._id === rideId);
        if (foundRide) {
          if (mode === 'edit_ride' && foundRide.user_id === userData?._id && (foundRide.driver_id && foundRide.driver_accepted === 1 && foundRide.ride_price > 0)) {
            showModalAlert(
              t('error') || 'Error',
              t('ride.cannotEditAccepted') || 'This ride has already been accepted by a driver.',
              () => router.back()
            );
            return;
          }
          setRide(foundRide);
          if (foundRide.ride_price > 0) {
            setPriceInput(foundRide.ride_price.toString());
            setCurrencyInput(foundRide.ride_currency || 0);
          }
          setStartLocInput(foundRide.start_location || '');
          setEndLocInput(foundRide.end_location || '');
          setStopsInputs(foundRide.stops || []);
          setWithPackageInput(foundRide.with_package || 0);
          setPackageWeightInput(foundRide.package_weight ? foundRide.package_weight.toString() : '');
          setPackageDescriptionInput(foundRide.package_description || '');
          setCarpoolingInput(foundRide.carpooling || 0);
        } else {
          showModalAlert(
            t('ride.notFound') || 'Ride not found',
            t('ride.notFoundDescription') || 'This ride could not be found.',
            () => router.back()
          );
        }
      } else {
        showModalAlert(
          t('networkError') || 'Error',
          t('ride.fetchError') || 'Failed to fetch ride details.',
          () => router.back()
        );
      }
    } catch (error: any) {
      console.error('Error fetching ride details:', error);
      showModalAlert(
        t('networkError') || 'Error',
        t('ride.fetchError') || 'Failed to fetch ride details.',
        () => router.back()
      );
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [rideId, userData?._id, router, t, mode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRideDetails(true);
    setRefreshing(false);
  }, [fetchRideDetails]);

  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);

  const handleStopChange = (text: string, index: number) => {
    const updated = [...stopsInputs];
    updated[index] = { ...updated[index], address: text };
    setStopsInputs(updated);
  };

  const handleSubmit = async () => {
    if (!ride || !rideId || !userData?._id) return;

    if (mode === 'driver_accept') {
      const price = parseFloat(priceInput);
      if (isNaN(price) || price <= 0) {
        showModalAlert(t('error') || 'Error', t('ride.invalidPrice') || 'Please enter a valid price.');
        return;
      }

      try {
        setIsProcessing(true);
        const updateRideUrl = `${remote_url}/payall/API/update_ride`;
        const payload = {
          ride_id: rideId,
          ride: {
            driver_id: userData._id,
            ride_price: price,
            ride_currency: currencyInput,
            driver_accepted: 1
          }
        };

        const apiResponse = await axios.post(updateRideUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (apiResponse.data && apiResponse.data.success === '1') {
          showModalAlert(
            t('success') || 'Success',
            t('ride.updateSuccessDescription') || 'Ride accepted and price set successfully.',
            () => router.back()
          );
        } else {
          showModalAlert(
            t('error') || 'Error',
            apiResponse.data.error || (t('ride.updateFailed') || 'Failed to accept ride.')
          );
        }
      } catch (error: any) {
        console.error('Driver accept error:', error);
        showModalAlert(t('error') || 'Error', t('ride.updateFailed') || 'An error occurred.');
      } finally {
        setIsProcessing(false);
      }
    } else if (mode === 'client_confirm') {
      try {
        setIsProcessing(true);
        const updateRideUrl = `${remote_url}/payall/API/update_ride`;
        const payload = {
          ride_id: rideId,
          ride: {
            client_accepted: 1,
            ride_status: 1 // Match the ride status to accepted (matched)
          }
        };

        const apiResponse = await axios.post(updateRideUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (apiResponse.data && apiResponse.data.success === '1') {
          showModalAlert(
            t('success') || 'Success',
            t('ride.updateSuccessDescription') || 'Ride confirmed successfully!',
            () => router.back()
          );
        } else {
          showModalAlert(
            t('error') || 'Error',
            apiResponse.data.error || (t('ride.updateFailed') || 'Failed to confirm ride.')
          );
        }
      } catch (error: any) {
        console.error('Client confirm error:', error);
        showModalAlert(t('error') || 'Error', t('ride.updateFailed') || 'An error occurred.');
      } finally {
        setIsProcessing(false);
      }
    } else if (mode === 'edit_ride') {
      if (isRideOwner) {
        if (ride.driver_id && ride.driver_accepted === 1 && ride.ride_price > 0) {
          showModalAlert(
            t('error') || 'Error',
            t('ride.cannotEditAccepted') || 'This ride has already been accepted by a driver.'
          );
          return;
        }
        if (!startLocInput.trim()) {
          showModalAlert(t('error') || 'Error', t('confirmRide.invalidRide') || 'Starting location cannot be empty.');
          return;
        }
        if (!endLocInput.trim()) {
          showModalAlert(t('error') || 'Error', t('confirmRide.invalidRide') || 'Destination cannot be empty.');
          return;
        }
      }

      try {
        setIsProcessing(true);
        const updateRideUrl = `${remote_url}/payall/API/update_ride`;

        let updateFields = {};
        if (isRideOwner) {
          updateFields = {
            start_location: startLocInput,
            end_location: endLocInput,
            stops: stopsInputs,
            with_package: withPackageInput,
            package_weight: parseFloat(packageWeightInput) || 0,
            package_description: packageDescriptionInput,
            carpooling: carpoolingInput
          };
        } else if (isDriver) {
          const price = parseFloat(priceInput);
          if (isNaN(price) || price <= 0) {
            showModalAlert(t('error') || 'Error', t('ride.invalidPrice') || 'Please enter a valid price.');
            setIsProcessing(false);
            return;
          }
          updateFields = {
            ride_price: price,
            ride_currency: currencyInput
          };
        }

        const payload = {
          ride_id: rideId,
          ride: updateFields
        };

        const apiResponse = await axios.post(updateRideUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (apiResponse.data && apiResponse.data.success === '1') {
          showModalAlert(
            t('success') || 'Success',
            t('ride.updateSuccessDescription') || 'Ride details updated successfully.',
            () => router.back()
          );
        } else {
          showModalAlert(
            t('error') || 'Error',
            apiResponse.data.error || (t('ride.updateFailed') || 'Failed to update ride.')
          );
        }
      } catch (error: any) {
        console.error('Edit ride error:', error);
        showModalAlert(t('error') || 'Error', t('ride.updateFailed') || 'An error occurred.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const formatCurrency = (amount: number, currency: number): string => {
    const currencySymbol = currency === 0 ? 'FC' : 'USD';
    return `${amount} ${currencySymbol}`;
  };

  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes === 0) return '';
    if (minutes < 60) {
      return `${minutes} ${t('home.minutes') || 'min'}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${t('home.hours') || 'hrs'}`;
    }
    return `${hours} ${t('home.hours') || 'hrs'} ${remainingMinutes} ${t('home.minutes') || 'min'}`;
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

  if (!ride) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.loadingContainer}>
          <AppText
            text={t('ride.notFound') || 'Ride not found'}
            size="medium"
            styles={{ color: themeColors.gray }}
          />
          <AppButton
            title={t('close') || 'Go Back'}
            onPress={() => router.back()}
            styles={{ width: '80%', marginTop: 20 }}
          />
        </View>
      </AppView>
    );
  }

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} tintColor={themeColors.primary} />
          }
        >
          {/* Instruction header */}
          <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.headerTextContainer}>
            {/* <AppText
              size="big"
              bold
              text={mode === 'driver_accept'
                ? (t('ride.driverAcceptTitle') || 'Accept Ride & Set Price')
                : mode === 'client_confirm'
                  ? (t('ride.confirmRideTitle') || 'Confirm Ride')
                  : (t('ride.editRideTitle') || 'Edit Ride Details')
              }
              styles={{ color: themeColors.text, marginBottom: 6 }}
            /> */}
            <AppText
              // size="small"
              text={mode === 'driver_accept'
                ? (t('ride.enterPriceMandatory') || 'Please set a price for this ride. This price will be presented to the client.')
                : mode === 'client_confirm'
                  ? (t('ride.confirmRideDescription') || 'Please confirm the ride details and the price set by the driver.')
                  : (t('ride.editRideDescription') || 'Modify the locations, stops, or price details of your ride.')
              }
              styles={{ color: themeColors.gray, lineHeight: 18 }}
            />
          </Animated.View>

          {/* Route Card */}
          {(mode === 'edit_ride' && isRideOwner) ? (
            <Animated.View
              entering={FadeInUp.delay(100).springify()}
              style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}
            >
              <AppText size="normal" bold text={t('ride.route') || 'Route Details'} styles={{ marginBottom: 12, color: themeColors.text }} />

              <View style={{ gap: 12 }}>
                <View>
                  <AppText size="small" bold text={t('home.from') || 'From'} styles={{ color: themeColors.text, marginBottom: 6 }} />
                  <TextInput
                    value={startLocInput}
                    onChangeText={setStartLocInput}
                    placeholder={t('home.enterFrom') || 'Enter starting location'}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.priceInput,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                        borderColor: themeColors.border,
                        fontSize: 14,
                        padding: 12,
                      }
                    ]}
                  />
                </View>

                {stopsInputs.map((stop, index) => (
                  <View key={index} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <AppText size="small" bold text={`${t('home.stop') || 'Stop'} ${index + 1}`} styles={{ color: themeColors.text }} />
                      <Pressable
                        onPress={() => setStopsInputs(stopsInputs.filter((_, idx) => idx !== index))}
                        style={{ padding: 4 }}
                      >
                        <IconApp pack="FI" name="trash-2" size={16} color={themeColors.error || '#FF3B30'} />
                      </Pressable>
                    </View>
                    <TextInput
                      value={stop.address}
                      onChangeText={(text) => handleStopChange(text, index)}
                      placeholder={t('home.selectingStop') || 'Enter stop address'}
                      placeholderTextColor={themeColors.gray}
                      style={[
                        styles.priceInput,
                        {
                          color: themeColors.text,
                          backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                          borderColor: themeColors.border,
                          fontSize: 14,
                          padding: 12,
                        }
                      ]}
                    />
                  </View>
                ))}

                <Pressable
                  onPress={() => setStopsInputs([...stopsInputs, { address: '', latitude: 0, longitude: 0 }])}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: themeColors.primary,
                      marginTop: 8,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <IconApp pack="FI" name="plus" size={16} color={themeColors.primary} styles={{ marginRight: 6 }} />
                  <AppText size="small" bold text={t('home.addStop') || 'Add Stop'} styles={{ color: themeColors.primary }} />
                </Pressable>

                <View>
                  <AppText size="small" bold text={t('home.to') || 'To'} styles={{ color: themeColors.text, marginBottom: 6 }} />
                  <TextInput
                    value={endLocInput}
                    onChangeText={setEndLocInput}
                    placeholder={t('home.enterTo') || 'Enter destination'}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.priceInput,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                        borderColor: themeColors.border,
                        fontSize: 14,
                        padding: 12,
                      }
                    ]}
                  />
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInUp.delay(100).springify()}
              style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}
            >
              <AppText size="normal" bold text={t('ride.route') || 'Route'} styles={{ marginBottom: 12, color: themeColors.text }} />

              <View style={styles.locationRow}>
                <View style={[styles.locationIndicator, { backgroundColor: '#007AFF' }]} />
                <View style={styles.locationContent}>
                  <AppText size="normal" bold text={t('home.from') || 'From'} styles={styles.label} />
                  <AppText size="normal" text={ride.start_location} styles={{ color: themeColors.text }} />
                </View>
              </View>

              {ride.stops && ride.stops.length > 0 && (
                <>
                  {ride.stops.map((stop, index) => (
                    <View key={index} style={styles.locationRow}>
                      <View style={[styles.locationIndicator, { backgroundColor: '#FFA500' }]} />
                      <View style={styles.locationContent}>
                        <AppText size="normal" bold text={`${t('home.stop') || 'Stop'} ${index + 1}`} styles={styles.label} />
                        <AppText size="normal" text={stop.address} styles={{ color: themeColors.text }} />
                      </View>
                    </View>
                  ))}
                </>
              )}

              <View style={styles.locationRow}>
                <View style={[styles.locationIndicator, { backgroundColor: '#FF3B30' }]} />
                <View style={styles.locationContent}>
                  <AppText size="normal" bold text={t('home.to') || 'To'} styles={styles.label} />
                  <AppText size="normal" text={ride.end_location} styles={{ color: themeColors.text }} />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Details Card */}
          {(mode === 'edit_ride' && isRideOwner) ? (
            <Animated.View
              entering={FadeInUp.delay(150).springify()}
              style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}
            >
              <AppText size="normal" bold text={t('ride.details') || 'Ride Details'} styles={{ marginBottom: 16, color: themeColors.text }} />

              {/* Package Toggle */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconApp pack="FI" name="box" size={16} color={withPackageInput === 1 ? themeColors.primary : themeColors.gray} styles={{ marginRight: 8 }} />
                  <AppText i18nKey="home.hasPackage" size="small" styles={{ color: themeColors.text }} />
                </View>
                <SwitchApp
                  value={withPackageInput === 1}
                  onPress={(val) => setWithPackageInput(val ? 1 : 0)}
                />
              </View>

              {/* Package Details (if package is toggled) */}
              {withPackageInput === 1 && (
                <View style={{ marginBottom: 16, gap: 10 }}>
                  <View>
                    <AppText size="small" bold text={t('home.packageWeight') || 'Package Weight (kg)'} styles={{ color: themeColors.text, marginBottom: 6 }} />
                    <TextInput
                      value={packageWeightInput}
                      onChangeText={setPackageWeightInput}
                      placeholder={t('home.packageWeightPlaceholder') || 'e.g., 5'}
                      placeholderTextColor={themeColors.gray}
                      keyboardType="numeric"
                      style={[
                        styles.priceInput,
                        {
                          color: themeColors.text,
                          backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                          borderColor: themeColors.border,
                          fontSize: 14,
                          padding: 12,
                        }
                      ]}
                    />
                  </View>

                  <View>
                    <AppText size="small" bold text={t('home.packageDescription') || 'Package Description (optional)'} styles={{ color: themeColors.text, marginBottom: 6 }} />
                    <TextInput
                      value={packageDescriptionInput}
                      onChangeText={setPackageDescriptionInput}
                      placeholder={t('home.packageDescriptionPlaceholder') || 'e.g., Box containing clothes'}
                      placeholderTextColor={themeColors.gray}
                      style={[
                        styles.priceInput,
                        {
                          color: themeColors.text,
                          backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                          borderColor: themeColors.border,
                          fontSize: 14,
                          padding: 12,
                        }
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Carpooling Toggle */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                  <IconApp pack="FI" name="users" size={16} color={carpoolingInput === 1 ? themeColors.primary : themeColors.gray} styles={{ marginRight: 8 }} />
                  <AppText i18nKey="home.allowCarpooling" size="small" styles={{ color: themeColors.text, flex: 1 }} />
                </View>
                <SwitchApp
                  value={carpoolingInput === 1}
                  onPress={(val) => setCarpoolingInput(val ? 1 : 0)}
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInUp.delay(150).springify()}
              style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}
            >
              <AppText size="normal" bold text={t('ride.details') || 'Ride Details'} styles={{ marginBottom: 12, color: themeColors.text }} />

              <View style={styles.detailsGrid}>
                {ride.distance > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E' }]}>
                    <IconApp pack="FI" name="map" size={18} color={themeColors.primary} styles={{ marginBottom: 4 }} />
                    <AppText size="small" text={t('home.distance') || 'Distance'} styles={{ opacity: 0.7, marginBottom: 2, color: themeColors.text }} />
                    <AppText size="normal" bold text={`${ride.distance.toFixed(1)} km`} styles={{ color: themeColors.text }} />
                  </View>
                )}

                {ride.estimated_duration > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E' }]}>
                    <IconApp pack="FI" name="clock" size={18} color={themeColors.primary} styles={{ marginBottom: 4 }} />
                    <AppText size="small" text={t('home.duration') || 'Duration'} styles={{ opacity: 0.7, marginBottom: 2, color: themeColors.text }} />
                    <AppText size="normal" bold text={formatDuration(ride.estimated_duration)} styles={{ color: themeColors.text }} />
                  </View>
                )}
              </View>

              {/* Package & Carpooling info */}
              <View style={{ borderTopWidth: 0.5, borderTopColor: theme === 'light' ? '#F2F2F7' : '#2C2C2E', marginTop: 12, paddingTop: 12, gap: 10 }}>
                {/* Package info */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <IconApp pack="FI" name="box" size={16} color={ride.with_package === 1 ? themeColors.primary : themeColors.gray} styles={{ marginRight: 10, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <AppText size="small" text={t('home.packageOptions') || 'Package (Parcel)'} styles={{ opacity: 0.7, marginBottom: 1, color: themeColors.text }} />
                    {ride.with_package === 1 ? (
                      <AppText size="normal" bold text={`${ride.package_weight || 0} kg${ride.package_description ? ` (${ride.package_description})` : ''}`} styles={{ color: themeColors.text }} />
                    ) : (
                      <AppText size="normal" bold text={t('home.noPackage') || 'No package'} styles={{ color: themeColors.gray }} />
                    )}
                  </View>
                </View>

                {/* Carpooling info */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <IconApp pack="FI" name="users" size={16} color={ride.carpooling === 1 ? themeColors.primary : themeColors.gray} styles={{ marginRight: 10, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <AppText size="small" text={t('home.allowCarpooling') || 'Carpooling'} styles={{ opacity: 0.7, marginBottom: 1, color: themeColors.text }} />
                    <AppText
                      size="normal"
                      bold
                      text={ride.carpooling === 1 ? (t('home.carpoolingAllowed') || 'Allowed') : (t('home.carpoolingNotAllowed') || 'Not Allowed')}
                      styles={{ color: ride.carpooling === 1 ? themeColors.primary : themeColors.gray }}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Pricing Box / Input */}
          {(mode === 'driver_accept' || (mode === 'edit_ride' && isDriver)) ? (
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}
            >
              <AppText size="normal" bold text={t('ride.setPrice') || 'Set Ride Price'} styles={{ marginBottom: 12, color: themeColors.text }} />

              <View style={styles.priceInputContainer}>
                <TextInput
                  value={priceInput}
                  onChangeText={setPriceInput}
                  placeholder={t('ride.enterPrice') || 'Enter price'}
                  placeholderTextColor={themeColors.gray}
                  keyboardType="numeric"
                  style={[
                    styles.priceInput,
                    {
                      color: themeColors.text,
                      backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                      borderColor: themeColors.border,
                    }
                  ]}
                />
              </View>

              <View style={styles.currencyContainer}>
                <AppText
                  size="normal"
                  text={t('ride.currency') || 'Currency'}
                  styles={{ marginBottom: 12, color: themeColors.text }}
                />
                <View style={styles.currencyOptions}>
                  {[
                    { value: 0, label: 'FC' },
                    { value: 1, label: 'USD' }
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setCurrencyInput(option.value)}
                      style={({ pressed }) => [
                        styles.currencyOption,
                        {
                          backgroundColor: currencyInput === option.value
                            ? themeColors.primary + '15'
                            : theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                          borderColor: currencyInput === option.value ? themeColors.primary : 'transparent',
                          opacity: pressed ? 0.7 : 1,
                        }
                      ]}
                    >
                      <AppText
                        size="normal"
                        bold={currencyInput === option.value}
                        text={option.label}
                        styles={{ color: currencyInput === option.value ? themeColors.primary : themeColors.text }}
                      />
                      {currencyInput === option.value && (
                        <IconApp pack="FI" name="check" size={16} color={themeColors.primary} styles={{ marginLeft: 8 }} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}
            >
              <AppText size="normal" bold text={t('ride.price') || 'Ride Price'} styles={{ marginBottom: 12, color: themeColors.text }} />
              <View style={[styles.paymentBadge, { backgroundColor: themeColors.primary + '10' }]}>
                <IconApp pack="FI" name="dollar-sign" size={16} color={themeColors.primary} styles={{ marginRight: 8 }} />
                <AppText
                  size="xlarge"
                  bold
                  text={formatCurrency(ride.ride_price, ride.ride_currency || 0)}
                  styles={{ color: themeColors.primary }}
                />
              </View>
            </Animated.View>
          )}

          {/* Action Button */}
          <Animated.View
            entering={FadeInUp.delay(250).springify()}
            style={styles.actionButtonContainer}
          >
            <AppButton
              title={mode === 'driver_accept'
                ? (t('ride.driverAcceptSubmit'))
                : mode === 'client_confirm'
                  ? (t('ride.confirmRideConfirm'))
                  : (t('ride.editRideSubmit'))
              }
              onPress={handleSubmit}
              loadEnabled={isProcessing}
              color={mode === 'client_confirm' ? '#34C759' : themeColors.primary}
              styles={{ width: '100%' }}
            />

            {/* <AppButton
              title={t('cancel') || 'Cancel'}
              onPress={() => router.back()}
              outline
              color={themeColors.gray}
              textColor={themeColors.gray}
              styles={{ width: '100%', marginTop: 10 }}
            /> */}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {modalConfig && (
        <ModalApp
          title={modalConfig.title}
          description={modalConfig.description}
          singleButton={true}
          textCancelKey="close"
          onClose={() => {
            const callback = modalConfig.onClose;
            setModalConfig(null);
            dispatch(setShowModalApp(false));
            if (callback) {
              callback();
            }
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
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  headerTextContainer: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    marginTop: 5,
  },
  locationContent: {
    flex: 1,
  },
  label: {
    marginBottom: 2,
    opacity: 0.65,
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceInputContainer: {
    marginBottom: 16,
  },
  priceInput: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  currencyContainer: {
    marginTop: 8,
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
