import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/src/store/app/hooks';
import axios from 'axios';
import apiService from '@/src/services/api';
import { remote_url } from '@/src/constants/Constants';
import { TRide } from '@/src/Types';
import { useTranslation } from 'react-i18next';
import en from '@/src/lang/locales/en.json';
import fr from '@/src/lang/locales/fr.json';

const BACKGROUND_RIDE_POLL_TASK = 'BACKGROUND_RIDE_POLL_TASK';

// Configure notification behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

// Helper to fetch user details (for background and foreground notifications)
const fetchContactNameApi = async (contactId: string): Promise<string> => {
  try {
    const getUserUrl = `${remote_url}/payall/API/get_user`;
    const apiResponse = await axios.post(getUserUrl, {
      user_id: contactId,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
      return apiResponse.data.user.names || '';
    }
  } catch (error) {
    console.log('Failed to fetch contact details for notification:', error);
  }
  return '';
};

// ----------------------------------------------------
// HEADLESS BACKGROUND FETCH TASK (Runs when app is closed)
// ----------------------------------------------------
TaskManager.defineTask(BACKGROUND_RIDE_POLL_TASK, async () => {
  try {
    const rootPersistRaw = await AsyncStorage.getItem('persist:root');
    if (!rootPersistRaw) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const rootPersist = JSON.parse(rootPersistRaw);
    if (!rootPersist.persisted_app) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const persistedApp = JSON.parse(rootPersist.persisted_app);
    const userData = persistedApp.user_data;
    if (!userData || !userData._id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const getRidesUrl = `${remote_url}/payall/API/get_rides`;
    const apiResponse = await axios.post(getRidesUrl, {
      user_id: userData._id,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.rides) {
      const newRides: TRide[] = apiResponse.data.rides;
      const cacheKey = `@ride_states_cache_${userData._id}`;
      const cachedRidesRaw = await AsyncStorage.getItem(cacheKey);
      const cachedRides: { [key: string]: TRide } = cachedRidesRaw ? JSON.parse(cachedRidesRaw) : {};

      // If no cache, initialize cached rides and return
      if (Object.keys(cachedRides).length === 0) {
        const ridesMap: { [key: string]: TRide } = {};
        newRides.forEach(ride => {
          ridesMap[ride._id] = ride;
        });
        await AsyncStorage.setItem(cacheKey, JSON.stringify(ridesMap));
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }

      const lang = persistedApp.language || 'fr';
      const rideTranslations = (lang === 'en' ? en.ride : fr.ride) as any;
      let triggeredAny = false;

      // Evaluate state changes
      for (const newRide of newRides) {
        const prevRide = cachedRides[newRide._id];
        cachedRides[newRide._id] = newRide; // Update cache

        if (!prevRide) {
          continue;
        }

        const isMyRide = newRide.user_id === userData._id;
        const isMeDriver = newRide.driver_id === userData._id;

        // --- PASSENGER NOTIFICATIONS ---
        if (isMyRide) {
          // 1. Driver accepted
          if (prevRide.driver_accepted !== 1 && newRide.driver_accepted === 1 && !prevRide.driver_id && newRide.driver_id) {
            const driverName = await fetchContactNameApi(newRide.driver_id);
            const currencyStr = newRide.ride_currency === 1 ? 'USD' : 'FC';
            const body = rideTranslations.notificationRideAcceptedBody
              .replace('{{driverName}}', driverName || rideTranslations.driver || 'Chauffeur')
              .replace('{{price}}', String(newRide.ride_price))
              .replace('{{currency}}', currencyStr);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideAcceptedTitle,
                body,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 2. Driver cancelled acceptance
          if (prevRide.driver_accepted === 1 && newRide.driver_accepted !== 1 && prevRide.driver_id && !newRide.driver_id && newRide.ride_status === 0) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationDriverCancelledTitle,
                body: rideTranslations.notificationDriverCancelledBody,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 3. Ride started
          if (prevRide.ride_status !== 2 && newRide.ride_status === 2) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideStartedTitle,
                body: rideTranslations.notificationRideStartedBody,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 4. Ride completed
          if (prevRide.ride_status !== 3 && newRide.ride_status === 3) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideCompletedTitle,
                body: rideTranslations.notificationRideCompletedBody,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 5. Ride cancelled
          if (prevRide.ride_status !== 4 && newRide.ride_status === 4) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideCancelledTitle,
                body: rideTranslations.notificationRideCancelledBody,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }
        }

        // --- DRIVER NOTIFICATIONS ---
        if (isMeDriver) {
          // 1. Client confirmed ride
          if (prevRide.client_accepted !== 1 && newRide.client_accepted === 1 && newRide.ride_status === 1) {
            const userName = await fetchContactNameApi(newRide.user_id);
            const body = rideTranslations.notificationRideConfirmedBody
              .replace('{{userName}}', userName || rideTranslations.user || 'Client');

            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideConfirmedTitle,
                body,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 2. Client confirmed ready
          if (prevRide.client_start_confirmed !== 1 && newRide.client_start_confirmed === 1) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationClientReadyTitle,
                body: rideTranslations.notificationClientReadyBody,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 3. Completed
          if (prevRide.ride_status !== 3 && newRide.ride_status === 3) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideCompletedTitle,
                body: rideTranslations.notificationRideCompletedBodyDriver,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }

          // 4. Cancelled
          if (prevRide.ride_status !== 4 && newRide.ride_status === 4) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: rideTranslations.notificationRideCancelledTitle,
                body: rideTranslations.notificationRideCancelledBodyDriver,
                data: { rideId: newRide._id },
                sound: true,
              },
              trigger: null,
            });
            triggeredAny = true;
          }
        }
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedRides));
      return triggeredAny 
        ? BackgroundFetch.BackgroundFetchResult.NewData 
        : BackgroundFetch.BackgroundFetchResult.NoData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.log('Background task execution error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const RideNotificationContext = createContext<{}>({});

export function RideNotificationProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const previousRidesRef = useRef<{ [key: string]: TRide }>({});
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // 1. Request notification permissions, register channel, and fetch push token
    async function registerForPushNotificationsAsync() {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
      }

      const existingStatusRes = await Notifications.getPermissionsAsync() as any;
      const existingStatus = existingStatusRes.status;
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const statusRes = await Notifications.requestPermissionsAsync() as any;
        finalStatus = statusRes.status;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Fetch and upload Push Token if permissions are granted
      if (finalStatus === 'granted') {
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          console.log('Registered Push Token:', token);

          if (userData?._id && userData.notification_token !== token) {
            await apiService.updateUser({
              _id: userData._id,
              notification_token: token,
            });
            console.log('Push token uploaded to backend successfully.');
          }
        } catch (error) {
          console.log('Failed to fetch/upload push token:', error);
        }
      }
    }

    registerForPushNotificationsAsync();

    // 2. Listen for notification click responses to navigate to the Ride details screen
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const rideId = response.notification.request.content.data?.rideId;
      if (rideId) {
        router.push({ pathname: '/Ride', params: { rideId } } as any);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router, userData]);

  // 3. Register background fetch task on mount or login
  useEffect(() => {
    if (!userData?._id) {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_RIDE_POLL_TASK).catch(() => {});
      return;
    }

    const registerBackgroundFetch = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_RIDE_POLL_TASK);
        if (!isRegistered) {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_RIDE_POLL_TASK, {
            minimumInterval: 60 * 15, // 15 minutes (OS minimum requirement)
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('Background fetch registered successfully.');
        }
      } catch (err) {
        console.log('Background fetch registration failed:', err);
      }
    };

    registerBackgroundFetch();
  }, [userData?._id]);

  // 4. Foreground Polling
  useEffect(() => {
    if (!userData?._id) {
      hasInitializedRef.current = false;
      previousRidesRef.current = {};
      return;
    }

    const pollRides = async () => {
      try {
        const getRidesUrl = `${remote_url}/payall/API/get_rides`;
        const apiResponse = await axios.post(getRidesUrl, {
          user_id: userData._id,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.rides) {
          const newRides: TRide[] = apiResponse.data.rides;
          
          if (!hasInitializedRef.current) {
            // First fetch: initialize state and ref to avoid stale notifications
            const ridesMap: { [key: string]: TRide } = {};
            newRides.forEach(ride => {
              ridesMap[ride._id] = ride;
            });
            previousRidesRef.current = ridesMap;
            hasInitializedRef.current = true;
            return;
          }

          // Evaluate state changes
          for (const newRide of newRides) {
            const prevRide = previousRidesRef.current[newRide._id];
            previousRidesRef.current[newRide._id] = newRide; // Update reference store

            if (!prevRide) {
              continue;
            }

            const isMyRide = newRide.user_id === userData._id;
            const isMeDriver = newRide.driver_id === userData._id;

            // --- PASSENGER NOTIFICATIONS ---
            if (isMyRide) {
              // 1. Driver accepted the ride request
              const driverAcceptedJustNow = 
                (prevRide.driver_accepted !== 1 && newRide.driver_accepted === 1) && 
                (!prevRide.driver_id && newRide.driver_id);
              
              if (driverAcceptedJustNow) {
                const driverName = newRide.driver_id ? await fetchContactNameApi(newRide.driver_id) : '';
                const currencyStr = newRide.ride_currency === 1 ? 'USD' : 'FC';
                
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideAcceptedTitle'),
                    body: t('ride.notificationRideAcceptedBody', {
                      driverName: driverName || t('ride.driver'),
                      price: newRide.ride_price,
                      currency: currencyStr,
                    }),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 2. Driver cancelled the acceptance
              const driverCancelledJustNow = 
                (prevRide.driver_accepted === 1 && newRide.driver_accepted !== 1) &&
                (prevRide.driver_id && !newRide.driver_id) &&
                newRide.ride_status === 0;

              if (driverCancelledJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationDriverCancelledTitle'),
                    body: t('ride.notificationDriverCancelledBody'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 3. Ride started (status changed from 1 to 2)
              const rideStartedJustNow = 
                prevRide.ride_status !== 2 && newRide.ride_status === 2;
              
              if (rideStartedJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideStartedTitle'),
                    body: t('ride.notificationRideStartedBody'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 4. Ride completed (status changed from 2 to 3)
              const rideCompletedJustNow = 
                prevRide.ride_status !== 3 && newRide.ride_status === 3;
              
              if (rideCompletedJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideCompletedTitle'),
                    body: t('ride.notificationRideCompletedBody'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 5. Ride cancelled (status changed to 4)
              const rideCancelledJustNow = 
                prevRide.ride_status !== 4 && newRide.ride_status === 4;

              if (rideCancelledJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideCancelledTitle'),
                    body: t('ride.notificationRideCancelledBody'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }
            }

            // --- DRIVER NOTIFICATIONS ---
            if (isMeDriver) {
              // 1. User accepts ride terms (client confirms ride)
              const clientConfirmedJustNow = 
                prevRide.client_accepted !== 1 && newRide.client_accepted === 1 && newRide.ride_status === 1;

              if (clientConfirmedJustNow) {
                const userName = await fetchContactNameApi(newRide.user_id);
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideConfirmedTitle'),
                    body: t('ride.notificationRideConfirmedBody', {
                      userName: userName || t('ride.user'),
                    }),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 2. User starts ride confirmation (client_start_confirmed)
              const clientStartConfirmedJustNow = 
                prevRide.client_start_confirmed !== 1 && newRide.client_start_confirmed === 1;
              
              if (clientStartConfirmedJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationClientReadyTitle'),
                    body: t('ride.notificationClientReadyBody'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 3. Ride completed (status changed from 2 to 3)
              const rideCompletedJustNow = 
                prevRide.ride_status !== 3 && newRide.ride_status === 3;
              
              if (rideCompletedJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideCompletedTitle'),
                    body: t('ride.notificationRideCompletedBodyDriver'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }

              // 4. Ride cancelled (status changed to 4)
              const rideCancelledJustNow = 
                prevRide.ride_status !== 4 && newRide.ride_status === 4;

              if (rideCancelledJustNow) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: t('ride.notificationRideCancelledTitle'),
                    body: t('ride.notificationRideCancelledBodyDriver'),
                    data: { rideId: newRide._id },
                    sound: true,
                  },
                  trigger: null,
                });
              }
            }
          }
        }
      } catch (error) {
        console.log('Error polling rides for notifications:', error);
      }
    };

    pollRides(); // Initial immediate call
    const intervalId = setInterval(pollRides, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [userData?._id, t]);

  return (
    <RideNotificationContext.Provider value={{}}>
      {children}
    </RideNotificationContext.Provider>
  );
}

export function useRideNotifications() {
  return useContext(RideNotificationContext);
}
