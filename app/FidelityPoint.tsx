import IconApp from '@/src/components/app/IconApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function FidelityPoint() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const params = useLocalSearchParams();

  const point = useMemo(() => {
    try {
      if (params?.point && typeof params.point === 'string') {
        return JSON.parse(params.point);
      }
    } catch {
      // ignore
    }
    return null;
  }, [params]);

  useEffect(() => {
    navigation.setOptions({
      title: t('fidelityPoints.detailTitle'),
    });
  }, [navigation, t]);

  if (!point) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.center}>
          <AppText size="normal" text={t('error')} styles={{ color: themeColors.error }} />
        </View>
      </AppView>
    );
  }

  const created = point.createdAt ? new Date(point.createdAt) : null;
  const updated = point.updatedAt ? new Date(point.updatedAt) : null;
  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';

  const ride = typeof point.ride_id === 'object' && point.ride_id !== null ? point.ride_id : null;
  const startLoc = ride?.start_location || '';
  const endLoc = ride?.end_location || '';
  const stops = ride?.stops || [];
  const driverName = ride?.driver_id && typeof ride.driver_id === 'object' ? ride.driver_id.names : '';
  const clientName = userData?.names || 'Passenger';

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Points badge */}
        <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
          <IconApp pack="FI" name="award" size={32} color="#FFFFFF" />
          <AppText
            size="big"
            bold
            text={`+${point.points} ${t('fidelityPoints.pointsUnit')}`}
            styles={{ color: '#FFFFFF', marginTop: 8 }}
          />
          <AppText
            size="small"
            text={
              point.points_active === 1
                ? (t('fidelityPoints.active'))
                : (t('fidelityPoints.inactive'))
            }
            styles={{
              color: '#FFFFFF',
              opacity: 0.8,
              marginTop: 4,
            }}
          />
        </View>

        {ride ? (
          <View
            style={[
              styles.card,
              { backgroundColor: themeColors.background, borderColor: themeColors.border, padding: 16 },
            ]}
          >
            <AppText size="small" text="Route Details" styles={{ color: themeColors.gray, marginBottom: 12 }} />
            <View style={styles.routeContainer}>
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
          </View>
        ) : null}

        {/* Detail card */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.background, borderColor: themeColors.border },
          ]}
        >
          <Row
            label="User"
            value={clientName}
            themeColors={themeColors}
          />
          {!!driverName && (
            <Row
              label="Driver"
              value={driverName}
              themeColors={themeColors}
            />
          )}
          <Row
            label={t('fidelityPoints.earnedOn')}
            value={fmtDate(created)}
            themeColors={themeColors}
          />
          <Row
            label={t('fidelityPoints.updatedOn')}
            value={fmtDate(updated)}
            themeColors={themeColors}
            last
          />
        </View>
      </ScrollView>
    </AppView>
  );
}

function Row({
  label,
  value,
  themeColors,
  last = false,
}: {
  label: string;
  value: string;
  themeColors: typeof LightTheme;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: 0.5, borderBottomColor: themeColors.border },
      ]}
    >
      <AppText size="small" text={label} styles={{ color: themeColors.gray, flex: 1 }} />
      <AppText
        size="normal"
        text={value}
        numberLines={1}
        styles={{ color: themeColors.text, flex: 2, textAlign: 'right' }}
      />
    </View>
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
  scroll: {
    paddingBottom: 30,
  },
  badge: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  routeContainer: {
    paddingLeft: 4,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(0,0,0,0.06)',
    marginLeft: 8,
    marginVertical: 4,
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
});
