import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import FidelityPointItem from '@/src/components/lists/FidelityPointItem';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

export type ClientPoint = {
  _id: string;
  user_id: string;
  ride_id: string;
  points: number;
  points_active: number;
  createdAt?: string;
  updatedAt?: string;
};

export default function FidelityPoints() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<ClientPoint[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    navigation.setOptions({
      title: t('settings.fidelityPoints') || 'Fidelity Points',
    });
  }, [navigation, t]);

  const fetchPoints = useCallback(async () => {
    if (!userData?._id) return;
    try {
      setLoading(true);
      const url = `${remote_url}/payall/API/get_client_points`;
      const apiResponse = await axios.post(url, { user_id: userData._id }, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (apiResponse.data && apiResponse.data.success === '1') {
        setPoints(apiResponse.data.points || []);
        setTotal(apiResponse.data.total || 0);
      } else {
        setPoints([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Fetch client points error:', error);
      setPoints([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [userData?._id]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const onPressItem = (item: ClientPoint) => {
    router.push({ pathname: '/FidelityPoint', params: { point: JSON.stringify(item) } });
  };

  return (
    <AppView style={styles.container}>
      {/* Total banner */}
      <View style={[styles.totalBanner, { backgroundColor: themeColors.primary }]}>
        <AppText
          size="small"
          bold
          text={t('fidelityPoints.totalLabel') || 'Total points'}
          styles={{ color: '#FFFFFF', opacity: 0.85 }}
        />
        <AppText
          size="big"
          bold
          text={String(total)}
          styles={{ color: '#FFFFFF', marginTop: 2 }}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText size="small" text={t('loading') || 'Loading...'} styles={{ marginTop: 10, color: themeColors.gray }} />
        </View>
      ) : points.length === 0 ? (
        <View style={styles.center}>
          <IconApp pack="FI" name="navigation" size={54} color={themeColors.gray} styles={{ opacity: 0.5, marginBottom: 16 }} />
          <AppText
            size="normal"
            bold
            text={t('fidelityPoints.noPoints')}
            styles={{ color: themeColors.gray, marginBottom: 8 }}
          />
          <AppText
            size="small"
            text={t('fidelityPoints.startBooking')}
            styles={{ color: themeColors.gray, opacity: 0.75, textAlign: 'center', paddingHorizontal: 32 }}
          />
        </View>
      ) : (
        <FlashList
          data={points}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPressItem(item)}
              style={({ pressed }) => ({ marginBottom: 10, opacity: pressed ? 0.75 : 1 })}
            >
              <FidelityPointItem item={item} themeColors={themeColors} />
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
  totalBanner: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
