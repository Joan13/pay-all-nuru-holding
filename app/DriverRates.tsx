import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import RateItem from '@/src/components/lists/RateItem';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

type DriverRate = {
  _id: string;
  user_id: string;
  ride_id: string;
  driver_id: string;
  description?: string;
  rate: number;
  rate_active: number;
  createdAt?: string;
  updatedAt?: string;
};

export default function DriverRates() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const [loading, setLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<DriverRate[]>([]);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${remote_url}/payall/API/get_driver_rates`;
      const apiResponse = await axios.post(url, { driver_id: userData?._id }, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (apiResponse.data && apiResponse.data.success === '1') {
        setRates(apiResponse.data.rates || []);
      } else {
        setRates([]);
      }
    } catch (error) {
      console.error('Fetch driver rates error:', error);
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [userData?._id]);

  useEffect(() => {
    navigation.setOptions({
      title: t('settings.viewRates') || 'Driver Rates',
    });
  }, [navigation, t]);

  useEffect(() => {
    if (userData?._id) fetchRates();
  }, [userData?._id, fetchRates]);

  const onPressItem = (item: DriverRate) => {
    // pass full rate as JSON string to details screen
    router.push({ pathname: '/Rate', params: { rate: JSON.stringify(item) } });
  };

  return (
    <AppView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText size="small" text={t('loading') || 'Loading...'} styles={{ marginTop: 10, color: themeColors.gray }} />
        </View>
      ) : rates.length === 0 ? (
        <View style={styles.center}>
          <AppText size="normal" text={t('rate.noRates') || 'No ratings yet'} styles={{ color: themeColors.gray }} />
        </View>
      ) : (
        <FlashList
          data={rates}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => onPressItem(item)} style={{ marginBottom: 10 }}>
              <RateItem item={item} themeColors={themeColors} />
            </Pressable>
          )}
        />
      )}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

