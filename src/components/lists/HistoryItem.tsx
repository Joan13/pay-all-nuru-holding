// components/HistoryItem.tsx
import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { TRide } from '@/src/Types';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  item: TRide;
  onEdit?: () => void;
  onRefresh?: () => void;
};

const HistoryItem = ({ item, onEdit }: Props) => {
  const { t } = useTranslation();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const getStatusColor = (status: number): string => {
    switch (status) {
      case 0: return '#FFA500'; // Orange for pending
      case 1: return '#007AFF'; // Blue for accepted
      case 2: return '#34C759'; // Green for in progress
      case 3: return '#34C759'; // Green for completed
      case 4: return '#FF3B30'; // Red for cancelled
      default: return '#8E8E93'; // Gray for unknown
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const getStatusText = useCallback((status: number): string => {
    switch (status) {
      case 0: return t('rides.pending') || 'Pending';
      case 1: return t('rides.accepted') || 'Accepted';
      case 2: return t('rides.inProgress') || 'In Progress';
      case 3: return t('rides.completed') || 'Completed';
      case 4: return t('rides.cancelled') || 'Cancelled';
      default: return t('rides.unknown') || 'Unknown';
    }
  }, [t]);

  const memoizedItem = useMemo(() => {
    return (
      <Pressable
        onPress={() => {
          if (onEdit) {
            onEdit();
          }
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E',
            borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
            opacity: pressed ? 0.7 : 1,
          }
        ]}
      >
        {/* Header with Status and Arrow */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.ride_status) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.ride_status) }]} />
            <AppText 
              size="normal" 
              bold 
              text={getStatusText(item.ride_status)}
              styles={{ color: getStatusColor(item.ride_status) }}
            />
          </View>
          <IconApp pack="FI" name="chevron-right" size={16} color={themeColors.gray} />
        </View>

        {/* Route Information */}
        <View style={styles.routeContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.locationIndicator, { backgroundColor: '#007AFF' }]} />
            <View style={styles.locationContent}>
              <AppText size="normal" bold text={t('home.from') || 'From'} styles={styles.label} />
              <AppText size="normal" text={item.start_location} numberLines={1} styles={{ marginTop: 1 }} />
            </View>
          </View>

          {/* Stops */}
          {item.stops && item.stops.length > 0 && (
            <>
              {item.stops.slice(0, 2).map((stop, index) => (
                <View key={index} style={styles.locationRow}>
                  <View style={[styles.locationIndicator, { backgroundColor: '#FFA500' }]} />
                  <View style={styles.locationContent}>
                    <AppText size="normal" bold text={`${t('home.stop') || 'Stop'} ${index + 1}`} styles={styles.label} />
                    <AppText size="normal" text={stop.address} numberLines={1} styles={{ marginTop: 1 }} />
                  </View>
                </View>
              ))}
              {item.stops.length > 2 && (
                <View style={styles.locationRow}>
                  <View style={[styles.locationIndicator, { backgroundColor: '#FFA500', opacity: 0.5 }]} />
                  <View style={styles.locationContent}>
                    <AppText size="normal" bold text={`+${item.stops.length - 2} ${t('home.moreStops') || 'more stops'}`} styles={{ ...styles.label, opacity: 0.6 }} />
                  </View>
                </View>
              )}
            </>
          )}

          <View style={styles.locationRow}>
            <View style={[styles.locationIndicator, { backgroundColor: '#FF3B30' }]} />
            <View style={styles.locationContent}>
              <AppText size="normal" bold text={t('home.to') || 'To'} styles={styles.label} />
              <AppText size="normal" text={item.end_location} numberLines={1} styles={{ marginTop: 1 }} />
            </View>
          </View>
        </View>

        {/* Ride Details Footer */}
        <View style={[
          styles.footerContainer,
          { borderTopColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)' }
        ]}>
          <View style={styles.footerDetails}>
            {item.distance > 0 && (
              <View style={styles.footerItem}>
                <IconApp pack="FI" name="map" size={12} color={themeColors.gray} styles={{ marginRight: 4 }} />
                <AppText size="small" text={`${item.distance.toFixed(1)} ${t('home.km') || 'km'}`} styles={{ color: themeColors.gray }} />
              </View>
            )}
            <View style={styles.footerItem}>
              <IconApp pack="FI" name="clock" size={12} color={themeColors.gray} styles={{ marginRight: 4 }} />
              <AppText size="small" text={formatDate(item.start_time)} styles={{ color: themeColors.gray, opacity: 0.7 }} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [item, t, themeColors, theme, getStatusText, onEdit]);

  return memoizedItem;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  routeContainer: {
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  locationIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    marginTop: 4,
  },
  locationContent: {
    flex: 1,
  },
  label: {
    marginBottom: 2,
    opacity: 0.65,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 0.5,
  },
  footerDetails: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default HistoryItem;
