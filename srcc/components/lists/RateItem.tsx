import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { LightTheme } from '@/src/constants/Themes';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type DriverRate = {
  _id: string;
  rater_id?: {
    _id: string;
    names: string;
    user_name?: string;
  };
  ride_id?: {
    _id: string;
    start_location: string;
    end_location: string;
    stops?: { address: string }[];
    driver_id?: {
      _id: string;
      names: string;
      user_name?: string;
    };
  };
  rated_id?: string;
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

  const raterName = item.rater_id?.names || item.rater_id?.user_name || 'Passenger';
  const ride = item.ride_id;
  const startLoc = ride?.start_location || '';
  const endLoc = ride?.end_location || '';
  const stops = ride?.stops || [];
  const driverName = ride?.driver_id?.names || '';

  return (
    <View style={[styles.card, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <View>
          <AppText size="normal" bold text={raterName} styles={{ color: themeColors.text }} />
          <View style={styles.starsRow}>
            {stars.map((on, idx) => (
              <IconApp key={idx} pack={on ? "FA" : "FI"} name="star" size={14} color={on ? '#FFD700' : themeColors.gray} styles={{ marginRight: 2 }} />
            ))}
          </View>
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

      {!!item.description && (
        <View style={[styles.descriptionBox, { backgroundColor: themeColors.primary + '05', borderColor: themeColors.border }]}>
          <AppText
            size="normal"
            text={item.description}
            numberLines={4}
            styles={{ color: themeColors.text, fontStyle: 'italic' }}
          />
        </View>
      )}

      {!!driverName && (
        <View style={styles.driverContainer}>
          <IconApp pack="FI" name="user" size={12} color={themeColors.gray} styles={{ marginRight: 6 }} />
          <AppText size="small" text={`Driver: ${driverName}`} styles={{ color: themeColors.gray }} />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  descriptionBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 0.5,
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

