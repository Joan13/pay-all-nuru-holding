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
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Ride() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [ride, setRide] = useState<TRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showCancelRideModal, setShowCancelRideModal] = useState(false);
  const [showCancelAcceptModal, setShowCancelAcceptModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);
  const [driverRate, setDriverRate] = useState<number>(0);
  const [driverRateDesc, setDriverRateDesc] = useState<string>('');
  const [submittingRate, setSubmittingRate] = useState<boolean>(false);
  const [driverInfo, setDriverInfo] = useState<TUserData | null>(null);
  const [userInfo, setUserInfo] = useState<TUserData | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  const rideId = params.rideId as string;
  const isDriver = userData?.account_type === 1;
  const isAdmin = userData?.account_type === 2 || userData?.is_admin === true;
  const isRideOwner = !!ride && (ride.user_id === userData?._id);
  const isRideDriver = !!ride && (ride.driver_id === userData?._id);

  const updateRide = useCallback(async (updates: Partial<TRide>) => {
    if (!ride || !rideId) return false;

    try {
      setIsProcessing(true);
      const updateRideUrl = `${remote_url}/payall/API/update_ride`;
      const updatePayload = {
        ride_id: rideId,
        ride: updates,
      };

      const apiResponse = await axios.post(updateRideUrl, updatePayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1') {
        setRide(apiResponse.data.ride);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('Update Ride Error:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [ride, rideId]);

  const handleCancelRide = useCallback(() => {
    setShowCancelRideModal(true);
    dispatch(setShowModalApp(true));
  }, [dispatch]);

  const confirmCancelRide = useCallback(async () => {
    setShowCancelRideModal(false);
    dispatch(setShowModalApp(false));
    const success = await updateRide({ ride_status: 4 }); // 4 = cancelled
    if (success) {
      setTimeout(() => router.back(), 1500);
    }
  }, [updateRide, router, dispatch]);

  useEffect(() => {
    const getPreviousRouteName = (): string | undefined => {
      try {
        // @ts-ignore - react-navigation types differ under expo-router
        const state = navigation.getState?.();
        const routes = state?.routes ?? [];
        const index = state?.index ?? -1;
        if (routes.length > 1 && index > 0) {
          // previous route in the current navigator
          return routes[index - 1]?.name as string | undefined;
        }
      } catch {
        // ignore
      }
      return undefined;
    };

    const canCancel = isRideOwner && ride && (ride.ride_status === 0 || ride.ride_status === 1);
    const prevName = getPreviousRouteName();
    const cameFromTabsOrHistory =
      typeof prevName === 'string' &&
      (/\(tabs\)/i.test(prevName) || /history/i.test(prevName));

    navigation.setOptions({
      title: t('ride.title') || 'Ride Details',
      // iOS-only: customize back button label
      ...(Platform.OS === 'ios'
        ? {
            headerBackTitle:
              cameFromTabsOrHistory
                ? (t('history.title') || t('tabs.history') || 'Ride history')
                : undefined,
          }
        : {}),
      headerRight: canCancel ? () => (
        <Pressable
          onPress={handleCancelRide}
          disabled={isProcessing}
          style={{ marginRight: 15 }}
        >
          <IconApp pack="FI" name="trash-2" size={20} color={themeColors.error || '#FF3B30'} />
        </Pressable>
      ) : undefined,
    });
  }, [navigation, t, ride, isRideOwner, isProcessing, themeColors, handleCancelRide]);

  const fetchRide = useCallback(async () => {
    try {
      setLoading(true);
      const getRidesUrl = `${remote_url}/payall/API/get_rides`;
      const apiResponse = await axios.post(getRidesUrl, {
        user_id: userData?._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.rides) {
        const foundRide = apiResponse.data.rides.find((r: TRide) => r._id === rideId);
        if (foundRide) {
          setRide(foundRide);
        } else {
          Alert.alert(t('ride.notFound') || 'Ride not found', t('ride.notFoundDescription') || 'This ride could not be found.');
          router.back();
        }
      } else {
        Alert.alert(t('error') || 'Error', t('ride.fetchError') || 'Failed to fetch ride details.');
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching ride:', error);
      Alert.alert(t('error') || 'Error', t('ride.fetchError') || 'Failed to fetch ride details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [rideId, userData?._id, router, t]);

  useEffect(() => {
    if (rideId && userData?._id) {
      fetchRide();
    }
  }, [rideId, userData?._id, fetchRide]);

  const fetchContactInfo = useCallback(async (contactId: string, setContactInfo: (info: TUserData | null) => void) => {
    // If it's the current user, use Redux data
    if (contactId === userData?._id) {
      setContactInfo(userData);
      return;
    }

    try {
      setLoadingContact(true);
      // Try to fetch user info - if endpoint doesn't exist, this will fail gracefully
      const getUserUrl = `${remote_url}/payall/API/get_user`;
      const apiResponse = await axios.post(getUserUrl, {
        user_id: contactId,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
        setContactInfo(apiResponse.data.user as TUserData);
      }
    } catch (error: any) {
      // If getUser endpoint doesn't exist, we'll just not show contact info
      console.log('Could not fetch contact info:', error);
    } finally {
      setLoadingContact(false);
    }
  }, [userData]);

  useEffect(() => {
    if (ride) {
      // Fetch driver info if there's a driver and it's not the current user
      if (ride.driver_id && ride.driver_id !== userData?._id) {
        fetchContactInfo(ride.driver_id, setDriverInfo);
      } else if (ride.driver_id === userData?._id) {
        setDriverInfo(userData);
      } else {
        setDriverInfo(null);
      }

      // Fetch user (owner) info if it's not the current user and we're a driver/admin
      if ((isDriver || isAdmin) && ride.user_id && ride.user_id !== userData?._id) {
        fetchContactInfo(ride.user_id, setUserInfo);
      } else if (ride.user_id === userData?._id) {
        setUserInfo(userData);
      } else if (!isDriver && !isAdmin) {
        // If we're the owner, we don't need to show our own info
        setUserInfo(null);
      }
    }
  }, [ride, userData, isDriver, isAdmin, fetchContactInfo]);

  const handleCall = async (phoneNumber: string) => {
    if (!phoneNumber) return;
    const phoneUrl = `tel:${phoneNumber.replace(/[^\d+]/g, '')}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(t('error') || 'Error', t('ride.noContactInfo') || 'Cannot make phone call.');
      }
    } catch (error) {
      console.error('Error opening phone:', error);
      Alert.alert(t('error') || 'Error', t('ride.noContactInfo') || 'Cannot make phone call.');
    }
  };

  const getContactPhones = (contact: TUserData | null): string[] => {
    if (!contact) return [];
    if (contact.phone_numbers && contact.phone_numbers.length > 0) {
      return contact.phone_numbers.filter(p => p.trim() !== '');
    }
    return [];
  };

  const getContactEmails = (contact: TUserData | null): string[] => {
    if (!contact) return [];
    if (contact.user_emails && contact.user_emails.length > 0) {
      return contact.user_emails.filter(e => e.trim() !== '');
    }
    if (contact.user_email && contact.user_email.trim() !== '') {
      return [contact.user_email];
    }
    return [];
  };

  const handleAcceptRide = async () => {
    if (!userData?._id) return;
    
    const success = await updateRide({
      driver_id: userData._id,
      ride_status: 1, // 1 = accepted
    });
    
    if (success) {
      setTimeout(() => router.back(), 1500);
    }
  };

  const handleCancelAcceptRide = useCallback(() => {
    setShowCancelAcceptModal(true);
    dispatch(setShowModalApp(true));
  }, [dispatch]);

  const confirmCancelAcceptRide = useCallback(async () => {
    setShowCancelAcceptModal(false);
    dispatch(setShowModalApp(false));
    const success = await updateRide({
      driver_id: '',
      ride_status: 0, // Back to pending
    });
    if (success) {
      // Stay on the page, just refresh
    }
  }, [updateRide, dispatch]);

  const handleStartRide = async () => {
    const success = await updateRide({ ride_status: 2 }); // 2 = in progress
    if (success) {
      // Ride started
    }
  };

  const handleFinishRide = async () => {
    const success = await updateRide({ 
      ride_status: 3, // 3 = completed
      end_time: new Date().toISOString()
    });
    if (success) {
      // Ride finished
    }
  };

  const handleStatusChange = async (newStatus: number) => {
    if (ride && newStatus !== ride.ride_status) {
      await updateRide({ ride_status: newStatus });
    }
  };

  const handlePaymentMethodSelect = (newMethod: number) => {
    setSelectedPaymentMethod(newMethod);
  };

  const handlePaymentMethodConfirm = async () => {
    if (selectedPaymentMethod === null) return;
    setShowPaymentModal(false);
    dispatch(setShowModalApp(false));
    await updateRide({ ride_payment_method: selectedPaymentMethod });
    setSelectedPaymentMethod(null);
  };

  const handleSetPrice = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      Alert.alert(t('error') || 'Error', t('ride.invalidPrice'));
      return;
    }
    
    setShowPriceModal(false);
    dispatch(setShowModalApp(false));
    const success = await updateRide({ 
      ride_price: price,
      ride_currency: currencyInput 
    });
    if (success) {
      setPriceInput('');
      setCurrencyInput(0);
    }
  };

  const submitDriverRate = useCallback(async () => {
    if (!userData?._id || !ride || !ride.driver_id) return;
    if (driverRate < 1 || driverRate > 5) {
      Alert.alert(t('error') || 'Error', t('ride.invalidRate') || 'Please select a rating between 1 and 5.');
      return;
    }
    try {
      setSubmittingRate(true);
      const url = `${remote_url}/payall/API/add_driver_rate`;
      const payload = {
        user_id: userData._id,
        ride_id: ride._id,
        driver_id: ride.driver_id,
        description: driverRateDesc,
        rate: driverRate,
        rate_active: 1,
      };
      const apiResponse = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (apiResponse.data && apiResponse.data.success === '1') {
        Alert.alert(t('success') || 'Success', t('ride.rateSaved') || 'Your rating has been submitted.');
      } else {
        Alert.alert(t('error') || 'Error', apiResponse.data?.error || (t('ride.rateFailed') || 'Failed to submit rating.'));
      }
    } catch (error: any) {
      console.error('Add Driver Rate Error:', error);
      Alert.alert(t('error') || 'Error', t('ride.rateFailed') || 'Failed to submit rating.');
    } finally {
      setSubmittingRate(false);
    }
  }, [userData?._id, ride, driverRate, driverRateDesc, t]);

  const formatCurrency = (amount: number, currency: number): string => {
    // 0 = FC (Franc Congolais), can be extended for other currencies
    const currencySymbol = currency === 0 ? 'FC' : 'USD';
    return `${amount} ${currencySymbol}`;
  };

  // Removed unused getCurrencyName to satisfy linter

  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return t('rides.pending');
      case 1: return t('rides.accepted');
      case 2: return t('rides.inProgress');
      case 3: return t('rides.completed');
      case 4: return t('rides.cancelled');
      default: return t('rides.unknown');
    }
  };

  const getStatusColor = (status: number): string => {
    switch (status) {
      case 0: return '#FFA500'; // Orange for pending
      case 1: return '#007AFF'; // Blue for accepted
      case 2: return '#34C759'; // Green for in progress
      case 3: return '#34C759'; // Green for completed
      case 4: return '#FF3B30'; // Red for cancelled
      default: return '#8E8E93'; // Gray for unknown
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
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
        <View style={styles.emptyContainer}>
          <AppText
            text={t('ride.notFound') || 'Ride not found'}
            size="medium"
            styles={{ color: themeColors.gray, textAlign: 'center' }}
          />
        </View>
      </AppView>
    );
  }

  const canAccept = isDriver && ride.ride_status === 0 && !ride.driver_id;
  const canCancelAccept = isRideDriver && ride.ride_status === 1; // Driver can unaccept if status is accepted
  const canStartRide = isRideDriver && ride.ride_status === 1; // Driver can start if accepted
  const canFinishRide = isRideDriver && ride.ride_status === 2; // Driver can finish if in progress
  const rideStatus = ride?.ride_status ?? -1;
  // Only allow manual status changes while pending (0) by owner/admin.
  // For accepted (1): show only Start Ride and Cancel Accept.
  // For in progress (2): show only Completed.
  const canChangeStatus = (rideStatus === 0) && (isRideOwner || isAdmin);
  const canChangePayment = isRideOwner && ride.ride_status === 0; // Only when pending, not after acceptance
  // Driver can set price if ride is manual (ride_price is 0 or needs to be set) but only before accepting (status 0)
  // After acceptance, drivers cannot edit any ride details
  const canSetPrice = isRideDriver && ride.ride_status === 0 && (ride.ride_price === 0 || !ride.ride_price);
  // Once a ride is accepted (status 1), neither user nor driver can edit price/currency
  // Only owner can edit price and currency when ride is still pending (status 0)
  // Driver can only edit price/currency before accepting the ride (status 0)
  const canEditPriceCurrency = (isRideOwner || isRideDriver) && ride.ride_status === 0;
  const canRateDriver = isRideOwner && ride.ride_status === 3 && !!ride.driver_id; // after completed

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status Badge with Toolbar Actions */}
        <View style={styles.statusToolbar}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ride.ride_status) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(ride.ride_status) }]} />
            <AppText 
              size="normal" 
              bold 
              text={getStatusText(ride.ride_status)}
              styles={{ color: getStatusColor(ride.ride_status) }}
            />
          </View>
          
          {/* Toolbar Actions */}
          <View style={styles.toolbarActions}>
            {canAccept && (
              <Pressable
                onPress={handleAcceptRide}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.toolbarButtonWithText,
                  { 
                    backgroundColor: themeColors.primary,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <IconApp pack="FI" name="check" size={16} color="#FFFFFF" />
                    <AppText size="small" bold text={t('ride.takeRide') || t('ride.acceptRide') || 'Take Ride'} styles={{ color: '#FFFFFF', marginLeft: 6 }} />
                  </>
                )}
              </Pressable>
            )}

            {canCancelAccept && (
              <Pressable
                onPress={handleCancelAcceptRide}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.toolbarButtonWithText,
                  { 
                    backgroundColor: themeColors.error + '15',
                    borderColor: themeColors.error,
                    borderWidth: 1,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconApp pack="FI" name="x" size={16} color={themeColors.error} />
                <AppText size="small" bold text={t('ride.cancelAcceptRide') || 'Cancel Accept'} styles={{ color: themeColors.error, marginLeft: 6 }} />
              </Pressable>
            )}

            {canStartRide && (
              <Pressable
                onPress={handleStartRide}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.toolbarButtonWithText,
                  { 
                    backgroundColor: themeColors.primary,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconApp pack="FI" name="play" size={16} color="#FFFFFF" />
                <AppText size="small" bold text={t('ride.startRide') || 'Start Ride'} styles={{ color: '#FFFFFF', marginLeft: 6 }} />
              </Pressable>
            )}

            {canFinishRide && (
              <Pressable
                onPress={handleFinishRide}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.toolbarButtonWithText,
                  { 
                    backgroundColor: '#34C759',
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconApp pack="FI" name="check-circle" size={16} color="#FFFFFF" />
                <AppText size="small" bold text={t('ride.finishRide') || 'Finish Ride'} styles={{ color: '#FFFFFF', marginLeft: 6 }} />
              </Pressable>
            )}
            
            {canChangeStatus && (
              <Pressable
                onPress={() => {
                  dispatch(setShowModalApp(true));
                  setShowStatusModal(true);
                }}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.toolbarButton,
                  { 
                    backgroundColor: themeColors.primary + '15', 
                    borderColor: themeColors.primary, 
                    borderWidth: 1,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconApp pack="FI" name="edit" size={16} color={themeColors.primary} />
              </Pressable>
            )}
            
            {(canEditPriceCurrency || canSetPrice) && (
              <Pressable
                onPress={() => {
                  setPriceInput(ride.ride_price > 0 ? ride.ride_price.toString() : '');
                  setCurrencyInput(ride.ride_currency || 0);
                  dispatch(setShowModalApp(true));
                  setShowPriceModal(true);
                }}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.toolbarButton,
                  { 
                    backgroundColor: themeColors.primary + '15', 
                    borderColor: themeColors.primary, 
                    borderWidth: 1,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconApp pack="FI" name="dollar-sign" size={16} color={themeColors.primary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Route Information */}
        <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
          <AppText size="normal" bold text={t('ride.route') || 'Route'} styles={{ marginBottom: 12, color: themeColors.text }} />
          
          <View style={styles.locationRow}>
            <View style={[styles.locationIndicator, { backgroundColor: '#007AFF' }]} />
            <View style={styles.locationContent}>
              <AppText size="normal" bold text={t('home.from') || 'From'} styles={styles.label} />
              <AppText size="normal" text={ride.start_location} styles={{ marginTop: 1 }} />
            </View>
          </View>

          {ride.stops && ride.stops.length > 0 && (
            <>
              {ride.stops.map((stop, index) => (
                <View key={index} style={styles.locationRow}>
                  <View style={[styles.locationIndicator, { backgroundColor: '#FFA500' }]} />
                  <View style={styles.locationContent}>
                    <AppText size="normal" bold text={`${t('home.stop') || 'Stop'} ${index + 1}`} styles={styles.label} />
                    <AppText size="normal" text={stop.address} styles={{ marginTop: 1 }} />
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={styles.locationRow}>
            <View style={[styles.locationIndicator, { backgroundColor: '#FF3B30' }]} />
            <View style={styles.locationContent}>
              <AppText size="normal" bold text={t('home.to') || 'To'} styles={styles.label} />
              <AppText size="normal" text={ride.end_location} styles={{ marginTop: 1 }} />
            </View>
          </View>
        </View>

        {/* Contact Information */}
        {(driverInfo || (ride.driver_id && ride.driver_id === userData?._id)) && !isRideOwner && (
          <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
            <AppText size="normal" bold text={t('ride.contactDriver') || 'Contact Driver'} styles={{ marginBottom: 12, color: themeColors.text }} />
            
            {loadingContact ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <>
                {driverInfo && (
                  <>
                    <AppText size="small" bold text={driverInfo.names || ''} styles={{ marginBottom: 12, color: themeColors.text }} />
                    
                    {getContactPhones(driverInfo).length > 0 && (
                      <View style={styles.contactSection}>
                        {getContactPhones(driverInfo).map((phone, index) => (
                          <Pressable
                            key={index}
                            onPress={() => handleCall(phone)}
                            style={({ pressed }) => [
                              styles.contactItem,
                              {
                                backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                                opacity: pressed ? 0.7 : 1,
                              }
                            ]}
                          >
                            <IconApp pack="FI" name="phone" size={16} color={themeColors.primary} styles={{ marginRight: 10 }} />
                            <AppText size="normal" text={phone} styles={{ color: themeColors.text, flex: 1 }} />
                            <IconApp pack="FI" name="chevron-right" size={14} color={themeColors.gray} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                    
                    {getContactEmails(driverInfo).length > 0 && (
                      <View style={styles.contactSection}>
                        {getContactEmails(driverInfo).map((email, index) => (
                          <View
                            key={index}
                            style={[
                              styles.contactItem,
                              {
                                backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                              }
                            ]}
                          >
                            <IconApp pack="FI" name="mail" size={16} color={themeColors.primary} styles={{ marginRight: 10 }} />
                            <AppText size="normal" text={email} styles={{ color: themeColors.text, flex: 1 }} />
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {getContactPhones(driverInfo).length === 0 && getContactEmails(driverInfo).length === 0 && (
                      <AppText size="small" text={t('ride.noContactInfo') || 'No contact information available'} styles={{ color: themeColors.gray, fontStyle: 'italic' }} />
                    )}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {(userInfo || (ride.user_id && ride.user_id === userData?._id)) && (isDriver || isAdmin) && (
          <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
            <AppText size="normal" bold text={t('ride.contactUser') || 'Contact User'} styles={{ marginBottom: 12, color: themeColors.text }} />
            
            {loadingContact ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <>
                {userInfo && (
                  <>
                    <AppText size="small" bold text={userInfo.names || ''} styles={{ marginBottom: 12, color: themeColors.text }} />
                    
                    {getContactPhones(userInfo).length > 0 && (
                      <View style={styles.contactSection}>
                        {getContactPhones(userInfo).map((phone, index) => (
                          <Pressable
                            key={index}
                            onPress={() => handleCall(phone)}
                            style={({ pressed }) => [
                              styles.contactItem,
                              {
                                backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                                opacity: pressed ? 0.7 : 1,
                              }
                            ]}
                          >
                            <IconApp pack="FI" name="phone" size={16} color={themeColors.primary} styles={{ marginRight: 10 }} />
                            <AppText size="normal" text={phone} styles={{ color: themeColors.text, flex: 1 }} />
                            <IconApp pack="FI" name="chevron-right" size={14} color={themeColors.gray} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                    
                    {getContactEmails(userInfo).length > 0 && (
                      <View style={styles.contactSection}>
                        {getContactEmails(userInfo).map((email, index) => (
                          <View
                            key={index}
                            style={[
                              styles.contactItem,
                              {
                                backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                              }
                            ]}
                          >
                            <IconApp pack="FI" name="mail" size={16} color={themeColors.primary} styles={{ marginRight: 10 }} />
                            <AppText size="normal" text={email} styles={{ color: themeColors.text, flex: 1 }} />
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {getContactPhones(userInfo).length === 0 && getContactEmails(userInfo).length === 0 && (
                      <AppText size="small" text={t('ride.noContactInfo') || 'No contact information available'} styles={{ color: themeColors.gray, fontStyle: 'italic' }} />
                    )}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Ride Details */}
        <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
          <AppText size="normal" bold text={t('ride.details') || 'Ride Details'} styles={{ marginBottom: 12, color: themeColors.text }} />
          
          <View style={styles.detailsGrid}>
            {ride.distance > 0 && (
              <View style={[styles.detailCard, { backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E' }]}>
                <IconApp pack="FI" name="map" size={18} color={themeColors.primary} styles={{ marginBottom: 4 }} />
                <AppText size="small" text={t('home.km') || 'Distance'} styles={{ opacity: 0.7, marginBottom: 2 }} />
                <AppText size="normal" bold text={`${ride.distance.toFixed(1)} ${t('home.km') || 'km'}`} />
              </View>
            )}
            
            {ride.estimated_duration > 0 && (
              <View style={[styles.detailCard, { backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E' }]}>
                <IconApp pack="FI" name="clock" size={18} color={themeColors.primary} styles={{ marginBottom: 4 }} />
                <AppText size="small" text={t('home.duration') || 'Duration'} styles={{ opacity: 0.7, marginBottom: 2 }} />
                <AppText size="normal" bold text={formatDuration(ride.estimated_duration)} />
              </View>
            )}
            
            {ride.ride_price > 0 && (
              <View style={[styles.detailCard, { backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E' }]}>
                <IconApp pack="FI" name="dollar-sign" size={18} color={themeColors.primary} styles={{ marginBottom: 4 }} />
                <AppText size="small" text={t('ride.price') || 'Price'} styles={{ opacity: 0.7, marginBottom: 2 }} />
                <AppText size="normal" bold text={formatCurrency(ride.ride_price, ride.ride_currency || 0)} />
              </View>
            )}
          </View>

          <View style={styles.timeContainer}>
            <View style={styles.timeRow}>
              <IconApp pack="FI" name="calendar" size={14} color={themeColors.gray} styles={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <AppText size="small" text={t('history.startTime') || 'Start Time'} styles={{ opacity: 0.7, marginBottom: 1 }} />
                <AppText size="normal" text={formatDate(ride.start_time)} />
              </View>
            </View>

            {ride.end_time && (
              <View style={[styles.timeRow, { marginTop: 8 }]}>
                <IconApp pack="FI" name="calendar" size={14} color={themeColors.gray} styles={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <AppText size="small" text={t('history.endTime') || 'End Time'} styles={{ opacity: 0.7, marginBottom: 1 }} />
                  <AppText size="normal" text={formatDate(ride.end_time)} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method */}
        {canChangePayment && (
          <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
            <View style={styles.sectionHeader}>
              <AppText size="normal" bold text={t('ride.paymentMethod') || 'Payment Method'} styles={{ color: themeColors.text }} />
              <Pressable 
                onPress={() => {
                  setSelectedPaymentMethod(ride.ride_payment_method);
                  dispatch(setShowModalApp(true));
                  setShowPaymentModal(true);
                }}
                style={({ pressed }) => [
                  styles.editIconButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <IconApp pack="FI" name="edit-2" size={16} color={themeColors.primary} />
              </Pressable>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: themeColors.primary + '10' }]}>
              <IconApp pack="FI" name={ride.ride_payment_method === 0 ? "dollar-sign" : "credit-card"} size={14} color={themeColors.primary} styles={{ marginRight: 6 }} />
              <AppText 
                size="normal" 
                bold
                text={ride.ride_payment_method === 0 ? (t('confirmRide.cash') || 'Cash') : (t('confirmRide.online') || 'Online')} 
                styles={{ color: themeColors.primary }}
              />
            </View>
          </View>
        )}

        {/* Price Display (if set) */}
        {ride.ride_price > 0 && (
          <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
            <View style={styles.sectionHeader}>
              <AppText size="normal" bold text={t('ride.price') || 'Price'} styles={{ color: themeColors.text }} />
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: themeColors.primary + '10' }]}>
              <IconApp pack="FI" name="dollar-sign" size={14} color={themeColors.primary} styles={{ marginRight: 6 }} />
              <AppText 
                size="normal" 
                bold
                text={formatCurrency(ride.ride_price, ride.ride_currency || 0)} 
                styles={{ color: themeColors.primary }}
              />
            </View>
          </View>
        )}

        {/* Driver Rating (after completion by ride owner) */}
        {canRateDriver && (
          <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
            <AppText size="normal" bold text={t('ride.rateDriver') || 'Rate your driver'} styles={{ marginBottom: 12, color: themeColors.text }} />
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setDriverRate(n)}
                  style={({ pressed }) => [
                    styles.starButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <IconApp
                    pack="FI"
                    name="star"
                    size={22}
                    color={n <= driverRate ? '#FFD700' : themeColors.gray}
                  />
                </Pressable>
              ))}
            </View>
            <View style={{ marginTop: 12 }}>
              <TextInput
                value={driverRateDesc}
                onChangeText={setDriverRateDesc}
                placeholder={t('ride.rateDescriptionPlaceholder') || 'Share details about your experience (optional)'}
                placeholderTextColor={themeColors.gray}
                multiline
                numberOfLines={4}
                style={[
                  styles.priceInput,
                  {
                    color: themeColors.text,
                    backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                    borderColor: themeColors.border,
                    minHeight: 100,
                    textAlignVertical: 'top'
                  }
                ]}
              />
            </View>
            <Pressable
              onPress={submitDriverRate}
              disabled={submittingRate}
              style={({ pressed }) => [
                styles.toolbarButtonWithText,
                { 
                  backgroundColor: themeColors.primary,
                  alignSelf: 'flex-start',
                  marginTop: 12,
                  opacity: pressed || submittingRate ? 0.7 : 1
                }
              ]}
            >
              {submittingRate ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <IconApp pack="FI" name="send" size={16} color="#FFFFFF" />
                  <AppText size="small" bold text={t('ride.submitRate') || 'Submit rating'} styles={{ color: '#FFFFFF', marginLeft: 6 }} />
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Status Change Modal */}
      {showStatusModal && (
        <StatusChangeModal
          currentStatus={ride.ride_status}
          onSelect={handleStatusChange}
          onClose={() => {
            setShowStatusModal(false);
            dispatch(setShowModalApp(false));
          }}
          isRideDriver={isRideDriver}
          isRideOwner={isRideOwner}
          isAdmin={isAdmin}
          themeColors={themeColors}
          theme={theme}
        />
      )}

      {/* Payment Method Change Modal */}
      {showPaymentModal && (
        <ModalApp
          titleKey="ride.paymentMethod"
          singleButton={false}
          onClose={() => {
            setShowPaymentModal(false);
            dispatch(setShowModalApp(false));
            setSelectedPaymentMethod(null);
          }}
          onAction={handlePaymentMethodConfirm}
          textActionKey="confirmRide.confirm"
        >
          <PaymentMethodModal
            currentMethod={selectedPaymentMethod !== null ? selectedPaymentMethod : ride.ride_payment_method}
            onSelect={handlePaymentMethodSelect}
            onClose={() => {
              setShowPaymentModal(false);
              dispatch(setShowModalApp(false));
              setSelectedPaymentMethod(null);
            }}
            themeColors={themeColors}
            theme={theme}
          />
        </ModalApp>
      )}

      {/* Cancel Ride Confirmation Modal */}
      {showCancelRideModal && (
        <ModalApp
          titleKey="ride.cancelRide"
          singleButton={false}
          onClose={() => {
            setShowCancelRideModal(false);
            dispatch(setShowModalApp(false));
          }}
          onAction={confirmCancelRide}
          textActionKey="ride.cancel"
        >
          <View style={styles.modalContent}>
            <AppText
              size="normal"
              text={t('ride.cancelConfirm') || 'Are you sure you want to cancel this ride?'}
              styles={{ color: themeColors.text, textAlign: 'center' }}
            />
          </View>
        </ModalApp>
      )}

      {/* Cancel Accept Ride Confirmation Modal */}
      {showCancelAcceptModal && (
        <ModalApp
          titleKey="ride.cancelAcceptRide"
          singleButton={false}
          onClose={() => {
            setShowCancelAcceptModal(false);
            dispatch(setShowModalApp(false));
          }}
          onAction={confirmCancelAcceptRide}
          textActionKey="ride.cancel"
        >
          <View style={styles.modalContent}>
            <AppText
              size="normal"
              text={t('ride.cancelAcceptConfirm') || 'Are you sure you want to cancel accepting this ride?'}
              styles={{ color: themeColors.text, textAlign: 'center' }}
            />
          </View>
        </ModalApp>
      )}

      {/* Price Setting Modal */}
      {showPriceModal && (
        <ModalApp
          titleKey={canSetPrice ? "ride.setPrice" : "ride.editPrice"}
          singleButton={false}
          onClose={() => {
            setShowPriceModal(false);
            dispatch(setShowModalApp(false));
            setPriceInput('');
            setCurrencyInput(0);
          }}
          onAction={handleSetPrice}
          textActionKey="save"
        >
          <PriceSettingModal
            price={priceInput}
            currency={currencyInput}
            onPriceChange={setPriceInput}
            onCurrencyChange={setCurrencyInput}
            onSave={handleSetPrice}
            onClose={() => {
              setShowPriceModal(false);
              dispatch(setShowModalApp(false));
              setPriceInput('');
              setCurrencyInput(0);
            }}
            themeColors={themeColors}
            theme={theme}
          />
        </ModalApp>
      )}
    </AppView>
  );
}

// Status Change Modal Component
interface StatusChangeModalProps {
  currentStatus: number;
  onSelect: (status: number) => void;
  onClose: () => void;
  isRideDriver: boolean;
  isRideOwner: boolean;
  isAdmin: boolean;
  themeColors: typeof LightTheme;
  theme: string;
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ 
  currentStatus, 
  onSelect, 
  onClose, 
  isRideDriver,
  isRideOwner,
  isAdmin,
  themeColors, 
  theme 
}) => {
  const { t } = useTranslation();

  // Define all possible status options
  const allStatusOptions = [
    { value: 0, label: t('rides.pending') || 'Pending' },
    { value: 1, label: t('rides.accepted') || 'Accepted' },
    { value: 2, label: t('rides.inProgress') || 'In Progress' },
    { value: 3, label: t('rides.completed') || 'Completed' },
  ];

  // Filter valid next statuses based on current status and user role
  const getValidStatusOptions = () => {
    const validOptions = [];

    if (currentStatus === 0) {
      // Pending: can go to Accepted (by driver) or stay Pending
      // Owner can also change status when pending (but typically just to cancel)
      if (isRideDriver || isRideOwner || isAdmin) {
        validOptions.push(allStatusOptions[1]); // Accepted
      }
    } else if (currentStatus === 1) {
      // Accepted: can go to In Progress (by driver) or Completed (by driver) or back to Pending (cancel accept)
      if (isRideDriver || isAdmin) {
        validOptions.push(allStatusOptions[2]); // In Progress
        validOptions.push(allStatusOptions[3]); // Completed
        validOptions.push(allStatusOptions[0]); // Back to Pending (cancel accept)
      }
    } else if (currentStatus === 2) {
      // In Progress: can go to Completed (by driver) or back to Accepted (by driver)
      if (isRideDriver || isAdmin) {
        validOptions.push(allStatusOptions[3]); // Completed
        validOptions.push(allStatusOptions[1]); // Back to Accepted
      }
    } else if (currentStatus === 3 || currentStatus === 4) {
      // Completed or Cancelled: no status changes allowed (final states)
      return [];
    }

    // Always include current status to show what it currently is
    const currentOption = allStatusOptions.find(opt => opt.value === currentStatus);
    if (currentOption && !validOptions.find(opt => opt.value === currentStatus)) {
      validOptions.unshift(currentOption);
    }

    // Remove duplicates and sort
    const uniqueOptions = validOptions.filter((opt, index, self) =>
      index === self.findIndex((o) => o.value === opt.value)
    );

    return uniqueOptions;
  };

  const validStatusOptions = getValidStatusOptions();

  return (
    <ModalApp
      onClose={onClose}
      titleKey="ride.changeStatus"
      singleButton={true}
      onAction={onClose}
    >
      <View>
        {validStatusOptions.length === 0 ? (
          <AppText
            size="normal"
            text={t('ride.noStatusChange') || 'No status changes available'}
            styles={{ 
              color: themeColors.gray, 
              textAlign: 'center', 
              paddingVertical: 20 
            }}
          />
        ) : (
          validStatusOptions.map((option) => {
            const isCurrentStatus = currentStatus === option.value;
            const isDisabled = isCurrentStatus && validStatusOptions.length === 1;
            
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  if (!isDisabled && option.value !== currentStatus) {
                    onSelect(option.value);
                    onClose();
                  }
                }}
                disabled={isDisabled}
                style={({ pressed }) => [
                  styles.statusOption,
                  {
                    backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                    borderColor: isCurrentStatus ? themeColors.primary : 'transparent',
                    opacity: (pressed && !isDisabled) ? 0.7 : (isDisabled ? 0.5 : 1),
                  }
                ]}
              >
                <AppText
                  size="medium"
                  text={option.label}
                  styles={{ color: themeColors.text }}
                />
                {isCurrentStatus && (
                  <IconApp pack="FI" name="check" size={18} color={themeColors.primary} />
                )}
                {!isCurrentStatus && (
                  <IconApp pack="FI" name="chevron-right" size={18} color={themeColors.gray} />
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </ModalApp>
  );
};

// Payment Method Change Modal Component
interface PaymentMethodModalProps {
  currentMethod: number;
  onSelect: (method: number) => void;
  onClose: () => void;
  themeColors: typeof LightTheme;
  theme: string;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ currentMethod, onSelect, onClose, themeColors, theme }) => {
  const { t } = useTranslation();

  const paymentOptions = [
    { value: 0, label: t('confirmRide.cash') || 'Cash' },
    { value: 1, label: t('confirmRide.online') || 'Online' },
  ];

  return (
    <View>
      {paymentOptions.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={({ pressed }) => [
            styles.statusOption,
            {
              backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
              borderColor: currentMethod === option.value ? themeColors.primary : 'transparent',
              opacity: pressed ? 0.7 : 1,
            }
          ]}
        >
          <AppText
            size="medium"
            text={option.label}
            styles={{ color: themeColors.text }}
          />
          {currentMethod === option.value && (
            <IconApp pack="FI" name="check" size={18} color={themeColors.primary} />
          )}
        </Pressable>
      ))}
    </View>
  );
};

// Price Setting Modal Component
interface PriceSettingModalProps {
  price: string;
  currency: number;
  onPriceChange: (price: string) => void;
  onCurrencyChange: (currency: number) => void;
  onSave: () => void;
  onClose: () => void;
  themeColors: typeof LightTheme;
  theme: string;
}

const PriceSettingModal: React.FC<PriceSettingModalProps> = ({ price, currency, onPriceChange, onCurrencyChange, onSave, onClose, themeColors, theme }) => {
  const { t } = useTranslation();

  const currencyOptions = [
    { value: 0, label: 'FC' },
    { value: 1, label: 'USD' },
  ];

  return (
    <View>
      <View style={styles.priceInputContainer}>
        <TextInput
          value={price}
          onChangeText={onPriceChange}
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
          {currencyOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onCurrencyChange(option.value)}
              style={({ pressed }) => [
                styles.currencyOption,
                {
                  backgroundColor: currency === option.value 
                    ? themeColors.primary + '15' 
                    : theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                  borderColor: currency === option.value ? themeColors.primary : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
            >
              <AppText
                size="normal"
                bold={currency === option.value}
                text={option.label}
                styles={{ color: currency === option.value ? themeColors.primary : themeColors.text }}
              />
              {currency === option.value && (
                <IconApp pack="FI" name="check" size={16} color={themeColors.primary} styles={{ marginLeft: 8 }} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

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
  statusToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minHeight: 36,
  },
  modalContent: {
    padding: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    marginTop: 4,
  },
  locationContent: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    marginBottom: 2,
    opacity: 0.65,
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalBlur: {
    padding: 20,
    borderRadius: 20,
  },
  modalScroll: {
    maxHeight: 400,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  priceInputContainer: {
    marginBottom: 20,
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
  contactSection: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

