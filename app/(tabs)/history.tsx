import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import HistoryItem from '@/src/components/lists/HistoryItem';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { TRide } from '@/src/Types';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function History() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [rides, setRides] = useState<TRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalError, setModalError] = useState<{ titleKey: string; descriptionKey: string } | null>(null);
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();

  const fetchRides = useCallback(async (isRefresh: boolean = false) => {
    if (!userData || !userData._id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Only show loading screen on initial load, not on refresh
    if (!isRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

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
        setRides(apiResponse.data.rides);
        setModalError(null); // Clear any previous errors
      } else {
        setRides([]);
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: apiResponse.data?.error || 'error.fetchRidesErrorDescription',
        });
        // Only show modal on initial load, not on refresh
        if (!isRefresh) {
          dispatch(setShowModalApp(true));
        }
      }
    } catch (error: any) {
      setRides([]);
      if (error.response) {
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: error.response.data?.error || 'error.fetchRidesErrorDescription',
        });
      } else if (error.request) {
        setModalError({
          titleKey: 'error.networkError',
          descriptionKey: 'error.networkErrorDescription',
        });
      } else {
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: 'error.fetchRidesErrorDescription',
        });
      }
      // Only show modal on initial load, not on refresh
      if (!isRefresh) {
        dispatch(setShowModalApp(true));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData, dispatch]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const onRefresh = useCallback(() => {
    fetchRides(true); // Pass true to indicate this is a refresh
  }, [fetchRides]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rides;
    
    const query = searchQuery.toLowerCase();
    return rides.filter(ride =>
      ride.start_location.toLowerCase().includes(query) ||
      ride.end_location.toLowerCase().includes(query) ||
      (ride.stops && ride.stops.some(stop => stop.address.toLowerCase().includes(query)))
    );
  }, [rides, searchQuery]);

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

  const showSearch = rides.length > 1;

  return (
    <AppView style={styles.container}>
      <StatusBarApp />

      {/* Floating Search Bar - Only show if more than one ride */}
      {showSearch && (
        <AppView style={[
          styles.searchContainer,
          {
            // top: insets.top,
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
            placeholder={t('history.searchPlaceholder')}
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

      {filteredData.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.emptyContainer, 
            { paddingTop: showSearch ? 80 + insets.top : 20 + insets.top }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          <AppText
            text={t('history.noRides') || 'No rides found'}
            size="medium"
            styles={{ color: themeColors.gray, textAlign: 'center', marginBottom: 20 }}
          />
          <AppButton
            i18nKey="retry"
            onPress={onRefresh}
            styles={{ width: 120 }}
          />
        </ScrollView>
      ) : (
        <FlashList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <HistoryItem 
              item={item} 
              onRefresh={onRefresh}
              onEdit={() => {
                router.push({
                  pathname: '/Ride',
                  params: { rideId: item._id }
                });
              }}
            />
          )}
          contentContainerStyle={[
            styles.list, 
            { 
              paddingTop: showSearch ? 50 + insets.top : 20 + insets.top,
              paddingBottom: 20 + insets.bottom + 10 
            }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
              colors={[themeColors.primary]} // For Android
            />
          }
          showsVerticalScrollIndicator={true}
        />
      )}

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
  list: {
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    minHeight: '100%',
  },
});

