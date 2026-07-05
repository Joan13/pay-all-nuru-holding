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
      title: t('rate.title'),
    });
  }, [navigation, t]);

  if (!rate) {
    return (
      <AppView style={styles.container}>
        <View style={styles.center}>
          <AppText size="normal" text={t('error')} styles={{ color: themeColors.error }} />
        </View>
      </AppView>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < (rate.rate || 0));
  const created = rate.createdAt ? new Date(rate.createdAt) : null;
  const dateText = created ? created.toLocaleDateString() + ' ' + created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const raterName = rate.rater_id && typeof rate.rater_id === 'object' ? rate.rater_id.names : 'Passenger';
  const ride = rate.ride_id && typeof rate.ride_id === 'object' ? rate.ride_id : null;
  const startLoc = ride?.start_location || '';
  const endLoc = ride?.end_location || '';
  const stops = ride?.stops || [];
  const driverName = ride?.driver_id && typeof ride.driver_id === 'object' ? ride.driver_id.names : 'Driver';

  return (
    <AppView style={styles.container}>
      <View style={[styles.card, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
        <View style={styles.header}>
          <View>
            <AppText size="normal" bold text={raterName} styles={{ color: themeColors.text }} />
            <View style={styles.starsRow}>
              {stars.map((on: boolean, idx: number) => (
                <IconApp key={idx} pack={on ? "FA" : "FI"} name="star" size={16} color={on ? '#FFD700' : themeColors.gray} styles={{ marginRight: 4 }} />
              ))}
            </View>
          </View>
          {!!dateText && (
            <AppText size="small" text={dateText} styles={{ color: themeColors.gray }} />
          )}
        </View>

        {ride ? (
          <View style={styles.routeContainer}>
            <AppText size="small" text="Route Details" styles={{ color: themeColors.gray, marginBottom: 8 }} />
            {/* Departure */}
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: '#007AFF' }]} />
              <AppText size="small" text={startLoc} styles={{ color: themeColors.text, flex: 1 }} numberLines={1} />
            </View>

            {/* Stops */}
            {stops.map((stop: any, index: number) => (
              <View key={index} style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: '#FFA500' }]} />
                <AppText size="small" text={stop.address} styles={{ color: themeColors.text, flex: 1 }} numberLines={1} />
              </View>
            ))}

            {/* Destination */}
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: '#FF3B30' }]} />
              <AppText size="small" text={endLoc} styles={{ color: themeColors.text, flex: 1 }} numberLines={1} />
            </View>
          </View>
        ) : null}

        {!!rate.description && (
          <View style={{ marginTop: 16 }}>
            <AppText size="small" text={t('rate.description')} styles={{ color: themeColors.gray, marginBottom: 6 }} />
            <View style={[styles.descriptionBox, { backgroundColor: themeColors.primary + '05', borderColor: themeColors.border }]}>
              <AppText size="normal" text={rate.description} styles={{ fontStyle: 'italic' }} />
            </View>
          </View>
        )}

        {!!driverName && (
          <View style={styles.driverContainer}>
            <IconApp pack="FI" name="user" size={12} color={themeColors.gray} styles={{ marginRight: 6 }} />
            <AppText size="small" text={`Driver: ${driverName}`} styles={{ color: themeColors.gray }} />
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  routeContainer: {
    paddingLeft: 4,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(0,0,0,0.06)',
    marginLeft: 8,
    marginVertical: 12,
    gap: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: -4,
  },
  descriptionBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});

