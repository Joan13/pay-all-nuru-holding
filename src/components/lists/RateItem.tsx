import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { LightTheme } from '@/src/constants/Themes';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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

export default function RateItem({ item, themeColors }: { item: DriverRate; themeColors: typeof LightTheme }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < (item.rate || 0));
  const created = item.createdAt ? new Date(item.createdAt) : null;
  const dateText = created ? created.toLocaleDateString() + ' ' + created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={[styles.card, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <View style={styles.starsRow}>
          {stars.map((on, idx) => (
            <IconApp key={idx} pack="FI" name="star" size={16} color={on ? '#FFD700' : themeColors.gray} styles={{ marginRight: 4 }} />
          ))}
        </View>
        {!!dateText && (
          <AppText size="small" text={dateText} styles={{ color: themeColors.gray }} />
        )}
      </View>
      {!!item.description && (
        <AppText
          size="normal"
          text={item.description}
          numberLines={2}
          styles={{ color: themeColors.text, marginTop: 6 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
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

