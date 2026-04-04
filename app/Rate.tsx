import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

export default function Rate() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const params = useLocalSearchParams();

  const rate = useMemo(() => {
    try {
      if (params?.rate && typeof params.rate === 'string') {
        return JSON.parse(params.rate);
      }
    } catch {
      // ignore
    }
    return null;
  }, [params]);

  useEffect(() => {
    navigation.setOptions({
      title: t('rate.title') || 'Rate',
    });
  }, [navigation, t]);

  if (!rate) {
    return (
      <AppView style={styles.container}>
        <View style={styles.center}>
          <AppText size="normal" text={t('error') || 'Error'} styles={{ color: themeColors.error }} />
        </View>
      </AppView>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < (rate.rate || 0));
  const created = rate.createdAt ? new Date(rate.createdAt) : null;
  const dateText = created ? created.toLocaleDateString() + ' ' + created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <AppView style={styles.container}>
      <View style={[styles.card, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
        <View style={styles.header}>
          <View style={styles.starsRow}>
            {stars.map((on: boolean, idx: number) => (
              <IconApp key={idx} pack="FI" name="star" size={18} color={on ? '#FFD700' : themeColors.gray} styles={{ marginRight: 6 }} />
            ))}
          </View>
          {!!dateText && (
            <AppText size="small" text={dateText} styles={{ color: themeColors.gray }} />
          )}
        </View>

        <View style={{ marginTop: 12 }}>
          <AppText size="small" text="Ride ID" styles={{ color: themeColors.gray }} />
          <AppText size="normal" text={rate.ride_id} styles={{ marginTop: 2 }} />
        </View>

        <View style={{ marginTop: 12 }}>
          <AppText size="small" text="From user" styles={{ color: themeColors.gray }} />
          <AppText size="normal" text={rate.user_id} styles={{ marginTop: 2 }} />
        </View>

        <View style={{ marginTop: 12 }}>
          <AppText size="small" text="Driver" styles={{ color: themeColors.gray }} />
          <AppText size="normal" text={rate.driver_id} styles={{ marginTop: 2 }} />
        </View>

        {!!rate.description && (
          <View style={{ marginTop: 16 }}>
            <AppText size="small" text={t('rate.description') || 'Description'} styles={{ color: themeColors.gray, marginBottom: 6 }} />
            <AppText size="normal" text={rate.description} />
          </View>
        )}
      </View>
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
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    margin: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

