import IconApp from '@/src/components/app/IconApp';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import * as Location from 'expo-location';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const Map = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<MapRegion | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocationPermission = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError(t('map.locationPermissionDenied') || 'Location permission was denied. Please enable it in settings.');
        setLoading(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion: MapRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setLoading(false);
    } catch (err) {
      console.error('Location Error:', err);
      setError(t('map.locationError') || 'Failed to get your location. Please try again.');
      setLoading(false);
    }
  };

  const handleMyLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion: MapRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      
      // Try to animate map to location if map ref is available
      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (err) {
      console.error('Location Error:', err);
      Alert.alert(
        t('map.locationError') || 'Error',
        t('map.locationError') || 'Failed to get your location. Please try again.'
      );
    }
  };

  const renderMap = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <IconApp 
            pack="FI" 
            name="map" 
            size={64} 
            color={themeColors.gray} 
            styles={{ marginBottom: 20 }}
          />
          <AppText 
            text={error}
            size="medium"
            bold
            styles={{ textAlign: 'center', marginBottom: 10, color: themeColors.text }}
          />
          <AppText 
            i18nKey="map.mapErrorDescription"
            size="small"
            styles={{ textAlign: 'center', color: themeColors.gray, paddingHorizontal: 30 }}
          />
        </View>
      );
    }

    if (!region) {
      return null;
    }

    try {
  if (Platform.OS === 'ios') {
        return (
          <AppleMaps.View
            ref={mapRef}
            style={styles.map}
          />
        );
  } else if (Platform.OS === 'android') {
        return (
          <GoogleMaps.View
            ref={mapRef}
            style={styles.map}
          />
        );
  } else {
        return (
          <View style={styles.map}>
            <AppText 
              i18nKey="map.mapsOnlyAvailable"
              size="small" 
              styles={{ textAlign: 'center', marginTop: 50 }} 
            />
          </View>
        );
      }
    } catch (e) {
      console.error('Map Error:', e);
      setError(Platform.OS === 'android' 
        ? t('map.googleMapsError')
        : t('map.appleMapsError'));
      return null;
    }
  };

  if (loading) {
    return (
      <AppView style={styles.container}>
        <StatusBar translucent barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText 
            i18nKey="map.loadingLocation"
            size="small"
            styles={{ marginTop: 20, color: themeColors.gray }}
          />
        </View>
      </AppView>
    );
  }

  return (
    <AppView style={styles.container}>
      <StatusBar translucent barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
      
      {/* Map View */}
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>

      {/* Header Controls */}
      <Animated.View 
        entering={FadeIn.delay(200)}
        style={styles.headerContainer}
      >
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: themeColors.background }]}
        >
          <IconApp 
            pack="FI" 
            name="arrow-left" 
            size={20} 
            color={themeColors.text} 
            styles={{}}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* My Location Button */}
      <Animated.View 
        entering={FadeIn.delay(300)}
        style={styles.bottomControls}
      >
        <TouchableOpacity 
          onPress={handleMyLocation}
          style={[styles.myLocationButton, { backgroundColor: themeColors.background }]}
        >
          <IconApp 
            pack="FI" 
            name="navigation" 
            size={24} 
            color={themeColors.primary} 
            styles={{}}
          />
        </TouchableOpacity>
      </Animated.View>
    </AppView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 10,
  },
  myLocationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
});

export default Map;
