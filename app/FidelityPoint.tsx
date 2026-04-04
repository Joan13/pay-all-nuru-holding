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
      title: t('fidelityPoints.detailTitle') || 'Points Detail',
    });
  }, [navigation, t]);

  if (!point) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.center}>
          <AppText size="normal" text={t('error') || 'Error'} styles={{ color: themeColors.error }} />
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
            text={`+${point.points} ${t('fidelityPoints.pointsUnit') || 'pts'}`}
            styles={{ color: '#FFFFFF', marginTop: 8 }}
          />
          <AppText
            size="small"
            text={
              point.points_active === 1
                ? (t('fidelityPoints.active') || 'Active')
                : (t('fidelityPoints.inactive') || 'Inactive')
            }
            styles={{
              color: '#FFFFFF',
              opacity: 0.8,
              marginTop: 4,
            }}
          />
        </View>

        {/* Detail card */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.background, borderColor: themeColors.border },
          ]}
        >
          <Row
            label={t('fidelityPoints.rideId') || 'Ride'}
            value={point.ride_id}
            themeColors={themeColors}
          />
          <Row
            label={t('fidelityPoints.userId') || 'User'}
            value={point.user_id}
            themeColors={themeColors}
          />
          <Row
            label={t('fidelityPoints.earnedOn') || 'Earned on'}
            value={fmtDate(created)}
            themeColors={themeColors}
          />
          <Row
            label={t('fidelityPoints.updatedOn') || 'Updated on'}
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
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
