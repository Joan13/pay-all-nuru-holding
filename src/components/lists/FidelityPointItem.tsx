import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { LightTheme } from '@/src/constants/Themes';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export type ClientPoint = {
  _id: string;
  user_id: string;
  ride_id: {
    _id: string;
    start_location: string;
    end_location: string;
    stops?: { address: string }[];
    driver_id?: {
      _id: string;
      names: string;
      user_name?: string;
    };
  } | string;
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

  const ride = typeof item.ride_id === 'object' && item.ride_id !== null ? item.ride_id : null;
  const startLoc = ride?.start_location || '';
  const endLoc = ride?.end_location || '';
  const stops = ride?.stops || [];
  const driverName = ride?.driver_id && typeof ride.driver_id === 'object' ? ride.driver_id.names : '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColors.background, borderColor: themeColors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: themeColors.primary + '15' }]}>
          <IconApp pack="FI" name="award" size={18} color={themeColors.primary} />
          <AppText
            size="medium"
            bold
            text={`+${item.points}`}
            styles={{ color: themeColors.primary, marginLeft: 6 }}
          />
        </View>

        {!!dateText && (
          <AppText size="small" text={dateText} styles={{ color: themeColors.gray }} />
        )}
      </View>

      {ride ? (
        <View style={styles.routeContainer}>
          {/* Departure */}
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: '#007AFF' }]} />
            <AppText size="small" text={startLoc} styles={{ color: themeColors.text, flex: 1 }} numberLines={1} />
          </View>
          
          {/* Stops */}
          {stops.map((stop, index) => (
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

      {!!driverName && (
        <View style={styles.driverContainer}>
          <IconApp pack="FI" name="user" size={12} color={themeColors.gray} styles={{ marginRight: 6 }} />
          <AppText size="small" text={driverName} styles={{ color: themeColors.gray }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  routeContainer: {
    paddingLeft: 4,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(0,0,0,0.06)',
    marginLeft: 8,
    marginVertical: 8,
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
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
