import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { LightTheme } from '@/src/constants/Themes';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export type ClientPoint = {
  _id: string;
  user_id: string;
  ride_id: string;
  points: number;
  points_active: number;
  createdAt?: string;
  updatedAt?: string;
};

export default function FidelityPointItem({
  item,
  themeColors,
}: {
  item: ClientPoint;
  themeColors: typeof LightTheme;
}) {
  const created = item.createdAt ? new Date(item.createdAt) : null;
  const dateText = created
    ? created.toLocaleDateString() +
      ' ' +
      created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColors.background, borderColor: themeColors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: themeColors.primary + '18' }]}>
          <IconApp pack="FI" name="award" size={18} color={themeColors.primary} />
          <AppText
            size="medium"
            bold
            text={`+${item.points}`}
            styles={{ color: themeColors.primary, marginLeft: 6 }}
          />
        </View>

        <View style={styles.right}>
          {!!dateText && (
            <AppText size="small" text={dateText} styles={{ color: themeColors.gray }} />
          )}
          <AppText
            size="small"
            text={item.ride_id}
            numberLines={1}
            styles={{ color: themeColors.gray, marginTop: 2 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  right: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 12,
  },
});
