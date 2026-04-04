import IconApp from '@/src/components/app/IconApp';
import SwitchApp from '@/src/components/app/SwitchApp';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}


export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const isDriver = userData?.account_type === 1;
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const tabBarHeight = (Platform.OS === 'ios' ? 60 : 50) + insets.bottom + 10; // Match tab bar height from _layout.tsx
  const maxPanelHeight = screenHeight - insets.top - tabBarHeight - 20; // 20 for top margin and spacing
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<MapRegion | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null);
  const [toLocation, setToLocation] = useState<LocationData | null>(null);
  const [stops, setStops] = useState<LocationData[]>([]);
  const [isSelectingFrom, setIsSelectingFrom] = useState(false);
  const [isSelectingTo, setIsSelectingTo] = useState(false);
  const [isSelectingStop, setIsSelectingStop] = useState<number | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editingManualFrom, setEditingManualFrom] = useState(false);
  const [editingManualTo, setEditingManualTo] = useState(false);
  const [editingManualStop, setEditingManualStop] = useState<number | null>(null);
  const [tempManualFrom, setTempManualFrom] = useState('');
  const [tempManualTo, setTempManualTo] = useState('');
  const [tempManualStop, setTempManualStop] = useState('');
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  
  // Manual entry fields
  const [manualFrom, setManualFrom] = useState('');
  const [manualTo, setManualTo] = useState('');
  const [manualStops, setManualStops] = useState<string[]>(['']);
  const [rideTimeNow, setRideTimeNow] = useState(true);
  const [selectedRideDateTime, setSelectedRideDateTime] = useState<Date>(new Date());
  const [routeDuration, setRouteDuration] = useState<number | null>(null); // Duration in minutes
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [is3D, setIs3D] = useState(true); // Default to 3D view
  const mapRef = useRef<any>(null);

  useEffect(() => {
    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate map to region when it's set and set initial 3D view
  useEffect(() => {
    if (region && mapRef.current) {
      // Small delay to ensure map is mounted
      const timer = setTimeout(() => {
        try {
          if (typeof mapRef.current.animateToRegion === 'function') {
            mapRef.current.animateToRegion(region, 1000);
          }
          // Set initial 3D view with pitch
          if (is3D && mapRef.current.animateCamera) {
            mapRef.current.animateCamera({
              center: {
                latitude: region.latitude,
                longitude: region.longitude,
              },
              pitch: 45,
              heading: 0,
              altitude: 1000,
              zoom: region.latitudeDelta ? Math.log2(360 / region.latitudeDelta) : 15,
            }, { duration: 500 });
          }
        } catch (err) {
          console.error('Error animating to region:', err);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [region, is3D]);

  // Fetch route when both locations are set (only for map-selected locations, not manual entries)
  useEffect(() => {
    if (fromLocation && toLocation) {
      // Don't calculate route for manually entered destinations
      if (isManualLocation(fromLocation) || isManualLocation(toLocation)) {
        setRouteDistance(null);
        setRouteDuration(null);
        setRouteCoordinates([]);
        return;
      }
      // Check if any stop is manual
      const hasManualStop = stops.some(stop => isManualLocation(stop));
      if (hasManualStop) {
        setRouteDistance(null);
        setRouteDuration(null);
        setRouteCoordinates([]);
        return;
      }
      fetchRoute();
    } else {
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteCoordinates([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLocation, toLocation, stops]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError(t('map.locationPermissionDenied'));
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion: MapRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(newRegion);
      setLoading(false);
    } catch (err) {
      console.error('Location Error:', err);
      setError(t('map.locationError'));
      setLoading(false);
    }
  };

  const toggle3DView = async () => {
    const newIs3D = !is3D;
    setIs3D(newIs3D);
    if (mapRef.current) {
      const newPitch = newIs3D ? 45 : 0;
      try {
        // Get current camera position to preserve the view
        if (mapRef.current.getCamera) {
          const currentCamera = await mapRef.current.getCamera();
          if (currentCamera && mapRef.current.animateCamera) {
            mapRef.current.animateCamera({
              ...currentCamera,
              pitch: newPitch,
            }, { duration: 500 });
          }
        } else if (mapRef.current.animateCamera && region) {
          // Fallback: use region if getCamera is not available
          mapRef.current.animateCamera({
            center: {
              latitude: region.latitude,
              longitude: region.longitude,
            },
            pitch: newPitch,
            heading: 0,
            altitude: 1000,
            zoom: region.latitudeDelta ? Math.log2(360 / region.latitudeDelta) : 15,
          }, { duration: 500 });
        }
      } catch (err) {
        console.error('Error toggling 3D view:', err);
      }
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
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(newRegion);
      
      // Wait a bit for map to be ready, then animate
      setTimeout(() => {
        if (mapRef.current) {
          try {
            if (typeof mapRef.current.animateToRegion === 'function') {
              mapRef.current.animateToRegion(newRegion, 1000);
            } else if (typeof mapRef.current.animateToCoordinate === 'function') {
              mapRef.current.animateToCoordinate(
                { latitude: newRegion.latitude, longitude: newRegion.longitude },
                1000
              );
            }
          } catch (err) {
            console.error('Error animating map:', err);
          }
        }
      }, 100);
    } catch (err) {
      console.error('Location Error:', err);
    }
  };

  const toggleDetailsPanel = () => {
    setShowDetailsPanel(!showDetailsPanel);
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
  };

  const openManualEntry = () => {
    setShowManualEntry(true);
    // Pre-fill if locations exist
    if (fromLocation) setManualFrom(fromLocation.address);
    if (toLocation) setManualTo(toLocation.address);
    if (stops.length > 0) {
      setManualStops(stops.map(s => s.address));
    } else {
      setManualStops(['']);
    }
  };

  const closeManualEntry = () => {
    setShowManualEntry(false);
    setManualFrom('');
    setManualTo('');
    setManualStops(['']);
  };

  const addManualStop = () => {
    // Only allow adding a new stop if the last stop has at least 4 characters
    const lastStop = manualStops[manualStops.length - 1];
    if (lastStop && lastStop.trim().length >= 4) {
      setManualStops([...manualStops, '']);
    }
  };

  const removeManualStop = (index: number) => {
    const newStops = manualStops.filter((_, i) => i !== index);
    setManualStops(newStops.length > 0 ? newStops : ['']);
  };

  const updateManualStop = (index: number, value: string) => {
    const newStops = [...manualStops];
    newStops[index] = value;
    setManualStops(newStops);
  };

  const confirmManualEntry = () => {
    // Validate that both "From" and "To" are provided
    if (!manualFrom.trim() || !manualTo.trim()) {
      // Could show an error message here
      return;
    }

    // Set locations with 0 lat/lng for manual entries
    const fromLoc: LocationData = {
      address: manualFrom.trim(),
      latitude: 0,
      longitude: 0,
    };
    setFromLocation(fromLoc);

    // Set stops (filter out empty ones)
    const validStops = manualStops
      .filter(stop => stop.trim().length > 0)
      .map(stop => ({
        address: stop.trim(),
        latitude: 0,
        longitude: 0,
      }));
    setStops(validStops);

    // Set "To" location if provided
    if (manualTo.trim()) {
      const toLoc: LocationData = {
        address: manualTo.trim(),
        latitude: 0,
        longitude: 0,
      };
      setToLocation(toLoc);
    } else {
      setToLocation(null);
    }

    // Clear route data since we don't have coordinates
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteCoordinates([]);

    // Close manual entry
    closeManualEntry();
  };

  // Calculate distance between two coordinates using Haversine formula (fallback)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Calculate total distance through all waypoints (fallback when API fails)
  const calculateTotalDistanceWithStops = (
    from: LocationData,
    stops: LocationData[],
    to: LocationData
  ): number => {
    let totalDistance = 0;
    
    // Distance from start to first stop (or to destination if no stops)
    if (stops.length > 0) {
      totalDistance += calculateDistance(
        from.latitude,
        from.longitude,
        stops[0].latitude,
        stops[0].longitude
      );
      
      // Distance between stops
      for (let i = 0; i < stops.length - 1; i++) {
        totalDistance += calculateDistance(
          stops[i].latitude,
          stops[i].longitude,
          stops[i + 1].latitude,
          stops[i + 1].longitude
        );
      }
      
      // Distance from last stop to destination
      totalDistance += calculateDistance(
        stops[stops.length - 1].latitude,
        stops[stops.length - 1].longitude,
        to.latitude,
        to.longitude
      );
    } else {
      // No stops, just from to destination
      totalDistance = calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );
    }
    
    return totalDistance;
  };

  // Decode polyline from Google Directions API
  const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }
    return poly;
  };

  // Fetch route from Google Directions API
  const fetchRoute = async (currentStops: LocationData[] = stops) => {
    if (!fromLocation || !toLocation) return;

    // Don't calculate route for manually entered destinations (they have 0,0 coordinates)
    if (isManualLocation(fromLocation) || isManualLocation(toLocation)) {
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteCoordinates([]);
      return;
    }

    // Check if any stop is manual
    const hasManualStop = currentStops.some(stop => isManualLocation(stop));
    if (hasManualStop) {
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteCoordinates([]);
      return;
    }

    setIsLoadingRoute(true);
    try {
      const apiKey = 'AIzaSyAVdzvslUud9DnFiOUtYHJobIUGcyZvhOo';
      const origin = `${fromLocation.latitude},${fromLocation.longitude}`;
      const destination = `${toLocation.latitude},${toLocation.longitude}`;
      
      // Build waypoints string if stops exist
      let waypointsParam = '';
      if (currentStops.length > 0) {
        const waypoints = currentStops.map(stop => `${stop.latitude},${stop.longitude}`).join('|');
        waypointsParam = `&waypoints=${encodeURIComponent(waypoints)}`;
      }
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&key=${apiKey}&alternatives=false`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.error_message) {
        console.error('Directions API error message:', data.error_message);
      }
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Calculate total distance and duration from all legs (includes all stops)
        // Each leg represents a segment: from->stop1, stop1->stop2, ..., stopN->to
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach((leg: any) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value; // Duration in seconds
        });
        const distanceKm = totalDistance / 1000;
        const durationMinutes = Math.round(totalDuration / 60); // Convert to minutes
        
        setRouteDistance(distanceKm);
        setRouteDuration(durationMinutes);

        // Decode polyline
        if (route.overview_polyline && route.overview_polyline.points) {
          const encodedPolyline = route.overview_polyline.points;
          const decodedCoordinates = decodePolyline(encodedPolyline);
          
          if (decodedCoordinates.length > 0) {
            setRouteCoordinates(decodedCoordinates);
          } else {
            throw new Error('No coordinates decoded from polyline');
          }
        } else {
          throw new Error('No polyline in route response');
        }
      } else {
        // Fallback: calculate total distance through all stops
        const totalDistance = calculateTotalDistanceWithStops(fromLocation, currentStops, toLocation);
        // Estimate duration: average 50 km/h speed for fallback calculation
        const estimatedDurationMinutes = Math.round((totalDistance / 50) * 60);
        setRouteDistance(totalDistance);
        setRouteDuration(estimatedDurationMinutes);
        
        // Build polyline coordinates for fallback (straight lines between points)
        const fallbackCoordinates = [
          { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
          ...currentStops.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude })),
          { latitude: toLocation.latitude, longitude: toLocation.longitude },
        ];
        setRouteCoordinates(fallbackCoordinates);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback: calculate total distance through all stops
      const totalDistance = calculateTotalDistanceWithStops(fromLocation, currentStops, toLocation);
      // Estimate duration: average 50 km/h speed for fallback calculation
      const estimatedDurationMinutes = Math.round((totalDistance / 50) * 60);
      setRouteDistance(totalDistance);
      setRouteDuration(estimatedDurationMinutes);
      
      // Build polyline coordinates for fallback (straight lines between points)
      const fallbackCoordinates = [
        { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
        ...currentStops.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude })),
        { latitude: toLocation.latitude, longitude: toLocation.longitude },
      ];
      setRouteCoordinates(fallbackCoordinates);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const parts: string[] = [];
        
        if (addr.street) parts.push(addr.street);
        if (addr.streetNumber) parts.push(addr.streetNumber);
        if (addr.city) parts.push(addr.city);
        if (addr.region) parts.push(addr.region);
        if (addr.postalCode) parts.push(addr.postalCode);
        
        return parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const handleMapClick = async (event: any) => {
    if (!isSelectingFrom && !isSelectingTo && isSelectingStop === null) return;
    
    // react-native-maps onPress event structure
    const coordinate = event.nativeEvent?.coordinate;
    if (!coordinate) {
      console.log('Map click event - no coordinate:', event);
      return;
    }
    
    const { latitude, longitude } = coordinate;
    
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return;
    }
    
    
    // Immediately stop selection mode to hide marker
    const wasSelectingFrom = isSelectingFrom;
    const wasSelectingTo = isSelectingTo;
    const stopIndex = isSelectingStop;
    setIsSelectingFrom(false);
    setIsSelectingTo(false);
    setIsSelectingStop(null);
    setIsSelectingLocation(false);
    
    setIsGeocoding(true);
    
    try {
      const address = await reverseGeocode(latitude, longitude);
      
      const locationData: LocationData = {
        address,
        latitude,
        longitude,
      };
      
      if (wasSelectingFrom) {
        setFromLocation(locationData);
      } else if (wasSelectingTo) {
        setToLocation(locationData);
      } else if (stopIndex !== null) {
        // Update existing stop or add new one
        const newStops = [...stops];
        if (stopIndex >= 0 && stopIndex < stops.length) {
          newStops[stopIndex] = locationData;
        } else {
          newStops.push(locationData);
        }
        setStops(newStops);
      }
    } catch (err) {
      console.error('Error handling map click:', err);
      // Restore selection state if geocoding fails
      if (wasSelectingFrom) {
        setIsSelectingFrom(true);
        setIsSelectingLocation(true);
      } else if (wasSelectingTo) {
        setIsSelectingTo(true);
        setIsSelectingLocation(true);
      } else if (stopIndex !== null) {
        setIsSelectingStop(stopIndex);
        setIsSelectingLocation(true);
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCameraMove = async (event: any) => {
    // Only update location if we're actively selecting
    if (!isSelectingFrom && !isSelectingTo && isSelectingStop === null) return;
    if (!isSelectingLocation) return; // Don't update if selection is already complete
    
    // react-native-maps onRegionChangeComplete event structure
    // Can be called with region object directly or wrapped in cameraPosition
    const latitude = event?.latitude || event?.cameraPosition?.target?.latitude;
    const longitude = event?.longitude || event?.cameraPosition?.target?.longitude;
    
    if (!latitude || !longitude) return;
    
    // Debounce geocoding to avoid too many requests
    if (isGeocoding) return;
    
    setIsGeocoding(true);
    
    try {
      const address = await reverseGeocode(latitude, longitude);
      
      const locationData: LocationData = {
        address,
        latitude,
        longitude,
      };
      
      if (isSelectingFrom) {
        setFromLocation(locationData);
      } else if (isSelectingTo) {
        setToLocation(locationData);
      } else if (isSelectingStop !== null) {
        const newStops = [...stops];
        if (isSelectingStop >= 0 && isSelectingStop < stops.length) {
          newStops[isSelectingStop] = locationData;
        } else {
          newStops.push(locationData);
        }
        setStops(newStops);
      }
      
      // Note: Don't set isSelectingLocation to false here
      // It should only be set to false when user clicks on map (handleMapClick)
      // This allows continuous updates while panning, but marker disappears on click
    } catch (err) {
      console.error('Error handling camera move:', err);
    } finally {
      // Small delay before allowing next geocoding
      setTimeout(() => setIsGeocoding(false), 1000);
    }
  };

  const startSelectingFrom = () => {
    setIsSelectingFrom(true);
    setIsSelectingTo(false);
    setIsSelectingStop(null);
    setIsSelectingLocation(true);
  };

  const startSelectingTo = () => {
    setIsSelectingTo(true);
    setIsSelectingFrom(false);
    setIsSelectingStop(null);
    setIsSelectingLocation(true);
  };

  const startSelectingStop = (index?: number) => {
    setIsSelectingStop(index !== undefined ? index : stops.length);
    setIsSelectingFrom(false);
    setIsSelectingTo(false);
    setIsSelectingLocation(true);
  };

  // Format duration in minutes to human-readable string
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? t('home.minute') : t('home.minutes')}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? t('home.hour') : t('home.hours')}`;
    }
    return `${hours} ${hours === 1 ? t('home.hour') : t('home.hours')} ${remainingMinutes} ${remainingMinutes === 1 ? t('home.minute') : t('home.minutes')}`;
  };

  // Check if location is manually entered (has 0,0 coordinates)
  const isManualLocation = (location: LocationData | null): boolean => {
    return location !== null && location.latitude === 0 && location.longitude === 0;
  };

  const startEditingManualFrom = () => {
    setEditingManualFrom(true);
    setTempManualFrom(fromLocation?.address || '');
  };

  const startEditingManualTo = () => {
    setEditingManualTo(true);
    setTempManualTo(toLocation?.address || '');
  };

  const startEditingManualStop = (index: number) => {
    setEditingManualStop(index);
    setTempManualStop(stops[index]?.address || '');
  };

  const saveManualFrom = () => {
    if (tempManualFrom.trim() && fromLocation) {
      setFromLocation({
        address: tempManualFrom.trim(),
        latitude: 0,
        longitude: 0,
      });
    }
    setEditingManualFrom(false);
    setTempManualFrom('');
  };

  const saveManualTo = () => {
    if (tempManualTo.trim() && toLocation) {
      setToLocation({
        address: tempManualTo.trim(),
        latitude: 0,
        longitude: 0,
      });
    }
    setEditingManualTo(false);
    setTempManualTo('');
  };

  const saveManualStop = () => {
    if (editingManualStop !== null && tempManualStop.trim()) {
      const newStops = [...stops];
      newStops[editingManualStop] = {
        address: tempManualStop.trim(),
        latitude: 0,
        longitude: 0,
      };
      setStops(newStops);
    }
    setEditingManualStop(null);
    setTempManualStop('');
  };

  const cancelManualEdit = () => {
    setEditingManualFrom(false);
    setEditingManualTo(false);
    setEditingManualStop(null);
    setTempManualFrom('');
    setTempManualTo('');
    setTempManualStop('');
  };

  const clearFrom = () => {
    setFromLocation(null);
    setStops([]); // Clear all stops when "From" is cleared
    setIsSelectingFrom(false);
    setIsSelectingLocation(false);
    // Also clear route data
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteCoordinates([]);
  };

  const clearTo = () => {
    setToLocation(null);
    setIsSelectingTo(false);
    setIsSelectingLocation(false);
  };

  const addStop = () => {
    startSelectingStop();
  };

  const removeStop = (index: number) => {
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
    
    // Immediately recalculate route with updated stops if route exists
    if (fromLocation && toLocation) {
      // Pass the new stops array directly to ensure we use the updated stops
      fetchRoute(newStops);
    } else {
      // Clear route if no longer valid
      setRouteDistance(null);
      setRouteCoordinates([]);
    }
  };

  const clearStop = (index: number) => {
    removeStop(index);
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
      return (
        <View style={styles.map}>
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 50 }} />
        </View>
      );
    }

    try {
      return (
        <>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={styles.map}
            initialRegion={region}
            region={region}
            onPress={handleMapClick}
            onRegionChangeComplete={(newRegion) => {
              if (isSelectingLocation && (isSelectingFrom || isSelectingTo || isSelectingStop !== null)) {
                // Use a debounced call to avoid too many geocoding requests
                handleCameraMove(newRegion);
              }
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            pitchEnabled={true}
          >
            {/* From Location Marker */}
            {fromLocation && (
              <Marker
                coordinate={{
                  latitude: fromLocation.latitude,
                  longitude: fromLocation.longitude,
                }}
                title={fromLocation.address}
                pinColor="#007AFF"
              />
            )}

            {/* To Location Marker */}
            {toLocation && (
              <Marker
                coordinate={{
                  latitude: toLocation.latitude,
                  longitude: toLocation.longitude,
                }}
                title={toLocation.address}
                pinColor="#FF3B30"
              />
            )}

            {/* Stop Markers */}
            {stops.map((stop, index) => (
              <Marker
                key={`stop-${index}`}
                coordinate={{
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                }}
                title={`${t('home.stop')} ${index + 1}: ${stop.address}`}
                pinColor="#FFA500"
              />
            ))}

            {/* Route Polyline */}
            {fromLocation && toLocation && routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={themeColors.primary}
                strokeWidth={4}
                geodesic={true}
              />
            )}
          </MapView>
          {isSelectingLocation && (isSelectingFrom || isSelectingTo || isSelectingStop !== null) && (
            <View style={styles.centerPinContainer} pointerEvents="none">
              <View style={[styles.centerPin, { borderColor: themeColors.primary }]}>
                <View style={[styles.centerPinDot, { backgroundColor: themeColors.primary }]} />
              </View>
            </View>
          )}
        </>
      );
    } catch (e) {
      console.error('Map Error:', e);
      setError(Platform.OS === 'android' 
        ? t('map.googleMapsError')
        : t('map.appleMapsError'));
      return (
        <View style={styles.map}>
          <AppText 
            text={error || (Platform.OS === 'android' ? t('map.googleMapsError') : t('map.appleMapsError'))}
            size="small" 
            styles={{ textAlign: 'center', marginTop: 50, color: themeColors.error }} 
          />
        </View>
      );
    }
  };

  // Don't render if not authenticated
  if (!userData || !userData._id || userData._id === '') {
    return null;
  }

  if (loading) {
    return (
      <AppView style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        />
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
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
      />
      {/* Map View */}
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>

      {/* Search Bar - Always at top */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={[
          styles.searchContainer,
          {
            top: insets.top + 10,
          },
        ]}
      >
        <BlurView
          intensity={80}
          tint={theme === 'light' ? 'light' : 'dark'}
          style={[
            styles.searchBar,
            {
              backgroundColor: theme === 'light' 
                ? 'rgba(255, 255, 255, 0.9)' 
                : 'rgba(0, 0, 0, 0.7)',
              borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            },
          ]}
        >
          <View style={styles.searchIconContainer}>
            <IconApp
              pack="FI"
              name="search"
              size={20}
              color={themeColors.gray}
              styles={{}}
            />
          </View>
          {fromLocation || toLocation ? (
            <View style={styles.searchTextContainer}>
              <TouchableOpacity
                onPress={startSelectingFrom}
                style={styles.locationRow}
                activeOpacity={0.7}
              >
                <View style={[styles.locationIndicator, { backgroundColor: themeColors.primary }]} />
                <View style={styles.locationContent}>
                  <AppText
                    i18nKey="home.from"
                    size="small"
                    bold
                    styles={{ color: themeColors.gray, marginBottom: 2 }}
                  />
                  <AppText
                    text={fromLocation?.address || t('home.chooseFromPlaceholder')}
                    size="small"
                    styles={{ color: themeColors.text }}
                    numberLines={1}
                  />
                </View>
                {fromLocation && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearFrom();
                    }}
                    style={styles.clearButton}
                  >
                    <IconApp
                      pack="FI"
                      name="x"
                      size={16}
                      color={themeColors.gray}
                      styles={{}}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {fromLocation && toLocation && (
                <View style={[styles.searchDivider, { backgroundColor: themeColors.border }]} />
              )}
              {fromLocation && (
              <TouchableOpacity
                onPress={startSelectingTo}
                style={styles.locationRow}
                activeOpacity={0.7}
              >
                <View style={[styles.locationIndicator, { backgroundColor: themeColors.error || '#FF3B30' }]} />
                <View style={styles.locationContent}>
                  <AppText
                    i18nKey="home.to"
                      size="small"
                      bold
                    styles={{ color: themeColors.gray, marginBottom: 2 }}
                  />
                  <AppText
                    text={toLocation?.address || t('home.chooseToPlaceholder')}
                    size="small"
                    styles={{ color: themeColors.text }}
                    numberLines={1}
                  />
                </View>
                {toLocation && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearTo();
                    }}
                    style={styles.clearButton}
                  >
                    <IconApp
                      pack="FI"
                      name="x"
                      size={16}
                      color={themeColors.gray}
                      styles={{}}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              )}
              {/* Show stops count if there are stops */}
              {stops.length > 0 && (
                <>
                  <View style={[styles.searchDivider, { backgroundColor: themeColors.border }]} />
                  <View style={styles.locationRow}>
                    <IconApp
                      pack="FI"
                      name="map-pin"
                      size={16}
                      color="#FFA500"
                      styles={{ marginRight: 10 }}
                    />
                    <AppText
                      text={`${stops.length} ${stops.length === 1 ? t('home.stop') : t('home.stops')}`}
                      size="small"
                      styles={{ color: themeColors.gray, flex: 1 }}
                    />
                    {fromLocation && (
                      <TouchableOpacity
                        onPress={addStop}
                        style={[styles.addStopQuickButton, { backgroundColor: themeColors.primary + '15' }]}
                        activeOpacity={0.7}
                      >
                        <IconApp
                          pack="FI"
                          name="plus"
                          size={14}
                          color={themeColors.primary}
                          styles={{}}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              {/* Show add stop button if no stops but from location is set */}
              {stops.length === 0 && fromLocation && (
                <>
                  {toLocation && (
                    <View style={[styles.searchDivider, { backgroundColor: themeColors.border }]} />
                  )}
                  <TouchableOpacity
                    onPress={addStop}
                    style={styles.addStopQuickButtonRow}
                    activeOpacity={0.7}
                  >
                    <IconApp
                      pack="FI"
                      name="plus"
                      size={14}
                      color={themeColors.primary}
                      styles={{ marginRight: 8 }}
                    />
                    <AppText
                      i18nKey="home.addStop"
                      size="small"
                      styles={{ color: themeColors.primary }}
                    />
                  </TouchableOpacity>
                </>
              )}
              
              {/* Ride Time Selection - Compact view */}
              {fromLocation && toLocation && (
                <>
                  <View style={[styles.searchDivider, { backgroundColor: themeColors.border }]} />
                  <View style={styles.locationRow}>
                    <IconApp
                      pack="FI"
                      name="calendar"
                      size={16}
                      color={themeColors.primary}
                      styles={{ marginRight: 10 }}
                    />
                    <AppText
                      i18nKey="home.rideTime"
                      size="small"
                      bold
                      styles={{ color: themeColors.gray, marginRight: 8 }}
                    />
                    <AppText
                      i18nKey="home.now"
                      size="small"
                      styles={{ color: themeColors.text, flex: 1 }}
                    />
                    <SwitchApp
                      value={rideTimeNow}
                      onPress={(value) => {
                        setRideTimeNow(value);
                        // If unchecking "Now", open details panel
                        if (!value) {
                          setShowDetailsPanel(true);
                        }
                      }}
                    />
                  </View>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={startSelectingFrom}
              style={styles.searchInputContainer}
              activeOpacity={0.7}
            >
              <TextInput
                placeholder={t('home.searchPlaceholder')}
                placeholderTextColor={themeColors.gray}
                style={[styles.searchInput, { color: themeColors.text }]}
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>
          )}
          {/* Manual Entry Button - show when no locations are defined */}
          {!fromLocation && !toLocation && stops.length === 0 && (
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              exiting={FadeOutDown.delay(100).springify()}
              style={styles.menuIconContainer}
            >
            <TouchableOpacity
                onPress={openManualEntry}
                style={[styles.manualEntryButton, { backgroundColor: themeColors.primary + '15' }]}
                activeOpacity={0.7}
              >
                <IconApp
                  pack="FI"
                  name="edit"
                  size={15}
                  color={themeColors.primary}
                  styles={{}}
                />
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {/* Menu icon - only show if there are ride details */}
          {(fromLocation || toLocation || stops.length > 0) && (
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              exiting={FadeOutDown.delay(100).springify()}
              style={styles.menuIconContainer}
            >
              <TouchableOpacity
                onPress={toggleDetailsPanel}
              style={styles.menuTrigger}
              activeOpacity={0.7}
            >
              <IconApp
                pack="FI"
                name="menu"
                size={22}
                color={themeColors.text}
                styles={{}}
              />
            </TouchableOpacity>
            </Animated.View>
          )}
        </BlurView>

              {/* Selection Hint - Under the panel */}
      {isSelectingLocation && (
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[
            styles.selectionHint,
            {
              // top: insets.top + 80,
              backgroundColor: themeColors.primary + '15',
              borderColor: themeColors.primary,
            },
          ]}
        >
          {isGeocoding ? (
            <ActivityIndicator size="small" color={themeColors.primary} />
          ) : (
            <>
              <IconApp
                pack="FI"
                name="map-pin"
                size={16}
                color={themeColors.primary}
                styles={{ marginRight: 8 }}
              />
              <AppText
                i18nKey={
                  isSelectingFrom 
                    ? 'home.selectingFrom' 
                    : isSelectingTo 
                    ? 'home.selectingTo'
                    : 'home.selectingStop'
                }
                size="small"
                styles={{ color: themeColors.primary }}
              />
            </>
          )}
        </Animated.View>
      )}
      </Animated.View>

      {/* Destinations Panel - Show when at least one location is set */}
      
      {/* {(fromLocation || toLocation) && (
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={[
            styles.destinationsPanel,
            {
              bottom: fromLocation && toLocation 
                ? 20 + insets.bottom + 10 + 80 // Space for confirm button
                : 20 + insets.bottom + 10,
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={[
              styles.destinationsPanelContent,
              {
                backgroundColor: theme === 'light' 
                  ? 'rgba(255, 255, 255, 0.95)' 
                  : 'rgba(0, 0, 0, 0.85)',
                borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          >
            {fromLocation && (
              <View style={styles.destinationRow}>
                <View style={[styles.destinationIndicator, { backgroundColor: themeColors.primary }]} />
                <View style={styles.destinationContent}>
                  <AppText
                    i18nKey="home.from"
                    size="small"
                    styles={{ color: themeColors.gray, marginBottom: 4 }}
                  />
                  <AppText
                    text={fromLocation.address}
                    size="small"
                    styles={{ color: themeColors.text }}
                    numberLines={2}
                  />
                </View>
              </View>
            )}
            {toLocation && (
              <View style={styles.destinationRow}>
                <View style={[styles.destinationIndicator, { backgroundColor: themeColors.error || '#FF3B30' }]} />
                <View style={styles.destinationContent}>
                  <AppText
                    i18nKey="home.to"
                    size="small"
                    styles={{ color: themeColors.gray, marginBottom: 4 }}
                  />
                  <AppText
                    text={toLocation.address}
                    size="small"
                    styles={{ color: themeColors.text }}
                    numberLines={2}
                  />
                </View>
              </View>
            )}
            {fromLocation && toLocation && routeDistance !== null && (
              <View style={[styles.distanceRow, { borderTopColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)' }]}>
                <IconApp
                  pack="FI"
                  name="map"
                  size={16}
                  color={themeColors.primary}
                  styles={{ marginRight: 8 }}
                />
                <AppText
                  i18nKey="home.distance"
                  size="small"
                  styles={{ color: themeColors.gray, marginRight: 4 }}
                />
                <AppText
                  text={`${routeDistance.toFixed(1)} ${t('home.km')}`}
                  size="small"
                  bold
                  styles={{ color: themeColors.primary }}
                />
              </View>
            )}
          </BlurView>
        </Animated.View>
      )} */}

      {/* Add Stop Button - Show when from and to are set */}
      {/* {fromLocation && toLocation && (
        <Animated.View
          entering={FadeInUp.delay(250).springify()}
          style={[
            styles.addStopButtonContainer,
            {
              bottom: 20 + insets.bottom + 10 + 70, // Space for confirm button
            },
          ]}
        >
          <TouchableOpacity
            onPress={addStop}
            style={[styles.addStopButtonOutlined, { borderColor: themeColors.primary }]}
            activeOpacity={0.8}
          >
            <IconApp
              pack="FI"
              name="plus"
              size={18}
              color={themeColors.primary}
              styles={{ marginRight: 8 }}
            />
            <AppText
              i18nKey="home.addStop"
              size="small"
              styles={{ color: themeColors.primary }}
              bold
            />
          </TouchableOpacity>
        </Animated.View>
      )} */}

      {/* Confirm Booking Button - Show when both destinations are set */}
      {fromLocation && toLocation && (
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={[
            styles.confirmButtonContainer,
            {
              bottom: 20 + insets.bottom + 10,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              if (!fromLocation || !toLocation) return;
              
              // Prepare ride data
              const rideData = {
                fromLocation,
                toLocation,
                stops,
                routeDistance,
                routeDuration,
                rideTimeNow,
                selectedRideDateTime: rideTimeNow ? null : selectedRideDateTime,
              };
              
              // Navigate to ConfirmRide page
              router.push({
                pathname: '/ConfirmRide',
                params: {
                  rideData: JSON.stringify(rideData),
                },
              });
            }}
            style={[
              styles.confirmButton, 
              { 
                backgroundColor: (isSelectingFrom || isSelectingTo || isSelectingStop !== null || 
                                  editingManualFrom || editingManualTo || editingManualStop !== null)
                  ? themeColors.gray 
                  : themeColors.primary 
              }
            ]}
            activeOpacity={0.8}
            disabled={isSelectingFrom || isSelectingTo || isSelectingStop !== null || 
                      editingManualFrom || editingManualTo || editingManualStop !== null}
          >
            <View style={styles.confirmButtonContent}>
              <AppText
                i18nKey="home.confirmBooking"
                size="medium"
                color='primaryForeground'
                bold
              />
              {routeDistance !== null && !isManualLocation(fromLocation) && !isManualLocation(toLocation) && (
                <AppText
                  text={`${routeDistance.toFixed(1)} ${t('home.km')}`}
                  size="small"
                  color='primaryForeground'
                  bold
                />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}



      {/* My Location Button */}
      <Animated.View 
        entering={FadeInUp.delay(400).springify()}
        style={[
          styles.myLocationButtonContainer,
          {
            bottom: 20 + insets.bottom + 10 + (isDriver ? 100 : 140),
          }
        ]}
      >
        <TouchableOpacity 
          onPress={handleMyLocation}
          style={[styles.myLocationButton, { backgroundColor: themeColors.background }]}
          activeOpacity={0.8}
        >
          <IconApp 
            pack="FI" 
            name="navigation" 
            size={22} 
            color={themeColors.primary} 
            styles={{}} 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* 3D/2D Toggle Button */}
      <Animated.View 
        entering={FadeInUp.delay(450).springify()}
        style={[
          styles.viewModeButtonContainer,
          {
            bottom: 20 + insets.bottom + 10 + (isDriver ? 100 : 140) - 62, // Position just above location button
          }
        ]}
      >
        <TouchableOpacity 
          onPress={toggle3DView}
          style={[styles.viewModeButton, { backgroundColor: themeColors.background }]}
          activeOpacity={0.8}
        >
          <IconApp 
            pack="FI" 
            name={is3D ? "maximize-2" : "minimize-2"} 
            size={20} 
            color={themeColors.primary} 
            styles={{}} 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Details Panel - Shows stops and full route details */}
      {showDetailsPanel && (fromLocation || toLocation || stops.length > 0) && (
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          exiting={FadeOutUp.delay(100).springify()}
          style={[
            styles.detailsPanel,
            {
              top: insets.top + 10,
              maxHeight: maxPanelHeight,
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={[
              styles.detailsPanelContent,
              {
                backgroundColor: theme === 'light' 
                  ? 'rgba(255, 255, 255, 0.95)' 
                  : 'rgba(0, 0, 0, 0.85)',
                borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          >
            {/* Header - Fixed */}
            <View style={styles.detailsPanelHeader}>
            <AppText
                i18nKey="home.routeDetails"
              size="medium"
                bold
                styles={{ color: themeColors.text }}
              />
              <TouchableOpacity
                onPress={closeDetailsPanel}
                style={styles.closeDetailsButton}
              >
                <IconApp
                  pack="FI"
                  name="x"
                  size={20}
                  color={themeColors.text}
                  styles={{}}
                />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
              <ScrollView
                style={styles.detailsPanelScrollView}
                contentContainerStyle={[styles.detailsPanelScrollContent, { paddingBottom: 16 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
              {/* From Location */}
              {fromLocation && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIndicator, { backgroundColor: themeColors.primary }]} />
                  <View style={styles.detailContent}>
                    <AppText
                      i18nKey="home.from"
                      size="small"
                      bold
                      styles={{ color: themeColors.gray, marginBottom: 4 }}
                    />
                    {editingManualFrom && isManualLocation(fromLocation) ? (
                      <View style={styles.manualEditContainer}>
                        <TextInput
                          value={tempManualFrom}
                          onChangeText={setTempManualFrom}
                          placeholder={t('home.enterFrom')}
                          placeholderTextColor={themeColors.gray}
                          style={[
                            styles.manualEditInput,
              {
                              backgroundColor: theme === 'light' 
                                ? 'rgba(0, 0, 0, 0.05)' 
                                : 'rgba(255, 255, 255, 0.1)',
                              color: themeColors.text,
                              borderColor: themeColors.border,
                            },
                          ]}
                          multiline
                          autoFocus
                        />
                        <View style={styles.manualEditActions}>
                          <TouchableOpacity
                            onPress={saveManualFrom}
                            style={[styles.manualEditSaveButton, { backgroundColor: themeColors.primary + '15' }]}
                          >
                            <IconApp
                              pack="FI"
                              name="check"
                              size={16}
                              color={themeColors.primary}
                              styles={{}}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={cancelManualEdit}
                            style={[styles.manualEditCancelButton, { backgroundColor: themeColors.gray + '15' }]}
                          >
                            <IconApp
                              pack="FI"
                              name="x"
                              size={16}
                              color={themeColors.gray}
                              styles={{}}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
            <AppText
                        text={fromLocation.address}
                        size="small"
                        styles={{ color: themeColors.text }}
                        numberLines={2}
                      />
                    )}
                  </View>
                  {!editingManualFrom && (
                    <TouchableOpacity
                      onPress={() => {
                        if (isManualLocation(fromLocation)) {
                          startEditingManualFrom();
                        } else {
                          startSelectingFrom();
                          closeDetailsPanel();
                        }
                      }}
                      style={styles.editButton}
                    >
                      <IconApp
                        pack="FI"
                        name="edit"
                        size={16}
                        color={themeColors.primary}
                        styles={{}}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Stops */}
              {stops.map((stop, index) => (
                <View key={`detail-stop-${index}`} style={styles.detailRow}>
                  <View style={[styles.detailIndicator, { backgroundColor: '#FFA500' }]} />
                  <View style={styles.detailContent}>
                    <AppText
                      text={`${t('home.stop')} ${index + 1}`}
                      size="small"
                      bold
                      styles={{ color: themeColors.gray, marginBottom: 4 }}
                    />
                    {editingManualStop === index && isManualLocation(stop) ? (
                      <View style={styles.manualEditContainer}>
                        <TextInput
                          value={tempManualStop}
                          onChangeText={setTempManualStop}
                          placeholder={`${t('home.stop')} ${index + 1}`}
                          placeholderTextColor={themeColors.gray}
                          style={[
                            styles.manualEditInput,
                            {
                              backgroundColor: theme === 'light' 
                                ? 'rgba(0, 0, 0, 0.05)' 
                                : 'rgba(255, 255, 255, 0.1)',
                              color: themeColors.text,
                              borderColor: themeColors.border,
                            },
                          ]}
                          multiline
                          autoFocus
                        />
                        <View style={styles.manualEditActions}>
                          <TouchableOpacity
                            onPress={saveManualStop}
                            style={[styles.manualEditSaveButton, { backgroundColor: themeColors.primary + '15' }]}
                          >
                            <IconApp
                              pack="FI"
                              name="check"
                              size={16}
                              color={themeColors.primary}
                              styles={{}}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={cancelManualEdit}
                            style={[styles.manualEditCancelButton, { backgroundColor: themeColors.gray + '15' }]}
                          >
                            <IconApp
                              pack="FI"
                              name="x"
                              size={16}
                              color={themeColors.gray}
                              styles={{}}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <AppText
                        text={stop.address}
                        size="small"
                        styles={{ color: themeColors.text }}
                        numberLines={2}
                      />
                    )}
                  </View>
                  {editingManualStop !== index && (
                    <View style={styles.detailActions}>
                      <TouchableOpacity
                        onPress={() => {
                          if (isManualLocation(stop)) {
                            startEditingManualStop(index);
                          } else {
                            startSelectingStop(index);
                            closeDetailsPanel();
                          }
                        }}
                        style={styles.editButton}
                      >
                        <IconApp
                          pack="FI"
                          name="edit"
                          size={16}
                          color={themeColors.primary}
                          styles={{}}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => clearStop(index)}
                        style={styles.editButton}
                      >
                        <IconApp
                          pack="FI"
                          name="trash-2"
                          size={16}
                          color={themeColors.error || '#FF3B30'}
                          styles={{}}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              {/* Add Stop Button */}
              {fromLocation && (
                <TouchableOpacity
                  onPress={() => {
                    addStop();
                    closeDetailsPanel();
                  }}
                  style={[styles.addStopButtonDetail, { borderColor: themeColors.primary }]}
                >
                  <IconApp
                    pack="FI"
                    name="plus"
                    size={18}
                    color={themeColors.primary}
                    styles={{ marginRight: 8 }}
                  />
                  <AppText
                    i18nKey="home.addStop"
                    size="small"
                    styles={{ color: themeColors.primary }}
                    bold
                  />
                </TouchableOpacity>
              )}

              {/* To Location */}
              {toLocation && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIndicator, { backgroundColor: themeColors.error || '#FF3B30' }]} />
                  <View style={styles.detailContent}>
                    <AppText
                      i18nKey="home.to"
                      size="small"
                      bold
                      styles={{ color: themeColors.gray, marginBottom: 4 }}
                    />
                    {editingManualTo && isManualLocation(toLocation) ? (
                      <View style={styles.manualEditContainer}>
                        <TextInput
                          value={tempManualTo}
                          onChangeText={setTempManualTo}
                          placeholder={t('home.enterTo')}
                          placeholderTextColor={themeColors.gray}
                          style={[
                            styles.manualEditInput,
                            {
                              backgroundColor: theme === 'light' 
                                ? 'rgba(0, 0, 0, 0.05)' 
                                : 'rgba(255, 255, 255, 0.1)',
                              color: themeColors.text,
                              borderColor: themeColors.border,
                            },
                          ]}
                          multiline
                          autoFocus
                        />
                        <View style={styles.manualEditActions}>
                          <TouchableOpacity
                            onPress={saveManualTo}
                            style={[styles.manualEditSaveButton, { backgroundColor: themeColors.primary + '15' }]}
                          >
                            <IconApp
                              pack="FI"
                              name="check"
                              size={16}
                              color={themeColors.primary}
                              styles={{}}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={cancelManualEdit}
                            style={[styles.manualEditCancelButton, { backgroundColor: themeColors.gray + '15' }]}
                          >
                            <IconApp
                              pack="FI"
                              name="x"
                              size={16}
                              color={themeColors.gray}
                              styles={{}}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <AppText
                        text={toLocation.address}
                        size="small"
                        styles={{ color: themeColors.text }}
                        numberLines={2}
                      />
                    )}
                  </View>
                  {!editingManualTo && (
                    <TouchableOpacity
                      onPress={() => {
                        if (isManualLocation(toLocation)) {
                          startEditingManualTo();
                        } else {
                          startSelectingTo();
                          closeDetailsPanel();
                        }
                      }}
                      style={styles.editButton}
                    >
                      <IconApp
                        pack="FI"
                        name="edit"
                        size={16}
                        color={themeColors.primary}
                        styles={{}}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Distance and Duration - Only show for map-selected locations (not manual) */}
              {fromLocation && toLocation && routeDistance !== null && 
               !isManualLocation(fromLocation) && !isManualLocation(toLocation) && (
                <>
                  <View style={[styles.distanceDetailRow, { borderTopColor: themeColors.border }]}>
                    <IconApp
                      pack="FI"
                      name="map"
                      size={16}
                      color={themeColors.primary}
                      styles={{ marginRight: 8 }}
                    />
                    <AppText
                      i18nKey="home.distance"
                      size="small"
                      styles={{ color: themeColors.gray, marginRight: 4 }}
                    />
                    <AppText
                      text={`${routeDistance.toFixed(1)} ${t('home.km')}`}
                      size="small"
                      bold
                      styles={{ color: themeColors.primary }}
                    />
                  </View>
                  {routeDuration !== null && (
                    <View style={[styles.distanceDetailRow, { borderTopWidth: 0, paddingTop: 0 }]}>
                      <IconApp
                        pack="FI"
                        name="clock"
                        size={16}
                        color={themeColors.primary}
                        styles={{ marginRight: 8 }}
                      />
                      <AppText
                        i18nKey="home.estimatedDuration"
                        size="small"
                        styles={{ color: themeColors.gray, marginRight: 4 }}
                      />
                      <AppText
                        text={formatDuration(routeDuration)}
                        size="small"
                        bold
                        styles={{ color: themeColors.primary }}
                      />
                    </View>
                  )}
                </>
              )}

              {/* Ride Time - Show for all rides in details panel */}
              {fromLocation && toLocation && (
                <View style={[styles.manualEntryRow, { borderTopColor: themeColors.border, marginTop: 12, paddingTop: 12, borderTopWidth: 1 }]}>
                  <View style={styles.rideTimeHeader}>
                    <AppText
                      i18nKey="home.rideTime"
                      size="small"
                      bold
                      styles={{ color: themeColors.gray, flex: 1 }}
                    />
                    <View style={styles.rideTimeSwitchContainer} pointerEvents="box-none">
                      <AppText
                        i18nKey="home.now"
                        size="small"
                        styles={{ color: themeColors.gray, marginRight: 8 }}
                      />
                      <View pointerEvents="auto">
                        <SwitchApp
                          value={rideTimeNow}
                          onPress={setRideTimeNow}
                        />
                      </View>
                    </View>
                  </View>
                  
                  {!rideTimeNow && (
                    <View style={styles.dateTimePickerContainer}>
                      <View style={[
                        styles.dateTimeButtonContainer,
                        {
                          backgroundColor: theme === 'light' 
                            ? 'rgba(0, 0, 0, 0.05)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          borderColor: themeColors.border,
                        },
                      ]}>
                        <IconApp
                          pack="FI"
                          name="calendar"
                          size={16}
                          color={themeColors.primary}
                          styles={{ marginRight: 8 }}
                        />
                        <TextInput
                          value={selectedRideDateTime.toISOString().split('T')[0]}
                          onChangeText={(text) => {
                            if (text && text.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              const [year, month, day] = text.split('-');
                              const newDate = new Date(selectedRideDateTime);
                              newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                              setSelectedRideDateTime(newDate);
                            }
                          }}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={themeColors.gray}
                          style={[
                            styles.dateTimeInput,
                            { color: themeColors.text },
                          ]}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[
                        styles.dateTimeButtonContainer,
                        {
                          backgroundColor: theme === 'light' 
                            ? 'rgba(0, 0, 0, 0.05)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          borderColor: themeColors.border,
                          marginLeft: 8,
                        },
                      ]}>
                        <IconApp
                          pack="FI"
                          name="clock"
                          size={16}
                          color={themeColors.primary}
                          styles={{ marginRight: 8 }}
                        />
                        <TextInput
                          value={selectedRideDateTime.toTimeString().slice(0, 5)}
                          onChangeText={(text) => {
                            if (text && text.match(/^\d{2}:\d{2}$/)) {
                              const [hours, minutes] = text.split(':');
                              const newDate = new Date(selectedRideDateTime);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setSelectedRideDateTime(newDate);
                            }
                          }}
                          placeholder="HH:MM"
                          placeholderTextColor={themeColors.gray}
                          style={[
                            styles.dateTimeInput,
                            { color: themeColors.text },
                          ]}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
            </KeyboardAvoidingView>
          </BlurView>
        </Animated.View>
      )}

      {/* Manual Entry Panel */}
      {showManualEntry && (
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          exiting={FadeOutUp.delay(100).springify()}
          style={[
            styles.detailsPanel,
            {
              top: insets.top + 10,
              maxHeight: maxPanelHeight,
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={[
              styles.detailsPanelContent,
              {
                backgroundColor: theme === 'light' 
                  ? 'rgba(255, 255, 255, 0.95)' 
                  : 'rgba(0, 0, 0, 0.85)',
                borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          >
            {/* Header */}
            <View style={styles.detailsPanelHeader}>
              <AppText
                i18nKey="home.manualEntry"
              size="medium"
                bold
                styles={{ color: themeColors.text }}
            />
              <TouchableOpacity
                onPress={closeManualEntry}
                style={styles.closeDetailsButton}
              >
                <IconApp
                  pack="FI"
                  name="x"
                  size={20}
                  color={themeColors.text}
                  styles={{}}
                />
              </TouchableOpacity>
        </View>

            {/* Scrollable Content */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
              <ScrollView
                style={styles.detailsPanelScrollView}
                contentContainerStyle={[styles.detailsPanelScrollContent, { paddingBottom: 16 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
              {/* From Location */}
              <View style={styles.manualEntryRow}>
                <AppText
                  i18nKey="home.from"
                  size="small"
                  bold
                  styles={{ color: themeColors.gray, marginBottom: 8 }}
                />
                <TextInput
                  value={manualFrom}
                  onChangeText={setManualFrom}
                  placeholder={t('home.enterFrom')}
                  placeholderTextColor={themeColors.gray}
                  style={[
                    styles.manualEntryInput,
                    {
                      backgroundColor: theme === 'light' 
                        ? 'rgba(0, 0, 0, 0.05)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: themeColors.text,
                      borderColor: themeColors.border,
                    },
                  ]}
                  multiline
                />
              </View>

              {/* Stops */}
              <View style={styles.manualEntryRow}>
                <AppText
                  i18nKey="home.stops"
                  size="small"
                  bold
                  styles={{ color: themeColors.gray, marginBottom: 8 }}
                />
                {manualStops.map((stop, index) => (
                  <View key={`manual-stop-${index}`} style={styles.manualStopRow}>
                    <TextInput
                      value={stop}
                      onChangeText={(value) => updateManualStop(index, value)}
                      placeholder={`${t('home.stop')} ${index + 1}`}
                      placeholderTextColor={themeColors.gray}
                      style={[
                        styles.manualEntryInput,
                        {
                          backgroundColor: theme === 'light' 
                            ? 'rgba(0, 0, 0, 0.05)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          color: themeColors.text,
                          borderColor: themeColors.border,
                          flex: 1,
                        },
                      ]}
                      multiline
                    />
                    {manualStops.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeManualStop(index)}
                        style={styles.removeStopButton}
                      >
                        <IconApp
                          pack="FI"
                          name="x"
                          size={16}
                          color={themeColors.error || '#FF3B30'}
                          styles={{}}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {manualStops[manualStops.length - 1]?.trim().length >= 4 && (
                  <TouchableOpacity
                    onPress={addManualStop}
                    style={styles.addManualStopButton}
                  >
                    <IconApp
                      pack="FI"
                      name="plus"
                      size={16}
                      color={themeColors.primary}
                      styles={{ marginRight: 8 }}
                    />
                    <AppText
                      i18nKey="home.addStop"
                      size="small"
                      styles={{ color: themeColors.primary }}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* To Location */}
              <View style={styles.manualEntryRow}>
                <AppText
                  i18nKey="home.to"
                  size="small"
                  bold
                  styles={{ color: themeColors.gray, marginBottom: 8 }}
                />
                <TextInput
                  value={manualTo}
                  onChangeText={setManualTo}
                  placeholder={t('home.enterTo')}
                  placeholderTextColor={themeColors.gray}
                  style={[
                    styles.manualEntryInput,
                    {
                      backgroundColor: theme === 'light' 
                        ? 'rgba(0, 0, 0, 0.05)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: themeColors.text,
                      borderColor: themeColors.border,
                    },
                  ]}
                  multiline
                />
              </View>

              {/* Ride Time Selection */}
              <View style={styles.manualEntryRow}>
                <View style={styles.rideTimeHeader}>
                  <AppText
                    i18nKey="home.rideTime"
                    size="small"
                    bold
                    styles={{ color: themeColors.gray, flex: 1 }}
                  />
                  <View style={styles.rideTimeSwitchContainer} pointerEvents="box-none">
                    <AppText
                      i18nKey="home.now"
                      size="small"
                      styles={{ color: themeColors.gray, marginRight: 8 }}
                    />
                    <View pointerEvents="auto">
                      <SwitchApp
                        value={rideTimeNow}
                        onPress={setRideTimeNow}
                      />
                    </View>
                  </View>
                </View>
                
                {!rideTimeNow && (
                  <View style={styles.dateTimePickerContainer}>
                    <View style={[
                      styles.dateTimeButtonContainer,
                      {
                        backgroundColor: theme === 'light' 
                          ? 'rgba(0, 0, 0, 0.05)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        borderColor: themeColors.border,
                      },
                    ]}>
                      <IconApp
                        pack="FI"
                        name="calendar"
                        size={16}
                        color={themeColors.primary}
                        styles={{ marginRight: 8 }}
                      />
                      <TextInput
                        value={selectedRideDateTime.toISOString().split('T')[0]}
                        onChangeText={(text) => {
                          if (text && text.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const [year, month, day] = text.split('-');
                            const newDate = new Date(selectedRideDateTime);
                            newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                            setSelectedRideDateTime(newDate);
                          }
                        }}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={themeColors.gray}
                        style={[
                          styles.dateTimeInput,
                          { color: themeColors.text },
                        ]}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[
                      styles.dateTimeButtonContainer,
                      {
                        backgroundColor: theme === 'light' 
                          ? 'rgba(0, 0, 0, 0.05)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        borderColor: themeColors.border,
                        marginLeft: 8,
                      },
                    ]}>
                      <IconApp
                        pack="FI"
                        name="clock"
                        size={16}
                        color={themeColors.primary}
                        styles={{ marginRight: 8 }}
                      />
                      <TextInput
                        value={selectedRideDateTime.toTimeString().slice(0, 5)}
                        onChangeText={(text) => {
                          if (text && text.match(/^\d{2}:\d{2}$/)) {
                            const [hours, minutes] = text.split(':');
                            const newDate = new Date(selectedRideDateTime);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            setSelectedRideDateTime(newDate);
                          }
                        }}
                        placeholder="HH:MM"
                        placeholderTextColor={themeColors.gray}
                        style={[
                          styles.dateTimeInput,
                          { color: themeColors.text },
                        ]}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={confirmManualEntry}
                style={[
                  styles.confirmManualButton,
                  {
                    backgroundColor: (manualFrom.trim() && manualTo.trim()) ? themeColors.primary : themeColors.gray,
                  },
                ]}
                activeOpacity={0.8}
                disabled={!manualFrom.trim() || !manualTo.trim()}
              >
                <AppText
                  i18nKey="home.confirm"
                  size="medium"
                  bold
                  color="primaryForeground"
                  styles={{ color: '#FFFFFF' }}
                />
              </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
          </BlurView>
        </Animated.View>
      )}
    </AppView>
  );
}

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  searchContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  searchIconContainer: {
    marginRight: 12,
    paddingVertical: 10,
    justifyContent: 'flex-start',
  },
  menuIconContainer: {
    marginLeft: 12,
    paddingVertical: 5,
    justifyContent: 'flex-start',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  searchInputContainer: {
    flex: 1,
  },
  searchTextContainer: {
    flex: 1,
  },
  searchDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  locationContent: {
    flex: 1,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  addStopQuickButton: {
    padding: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  addStopQuickButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectionHint: {
    // position: 'absolute',
    // left: 20,
    // right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    // zIndex: 20,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -30,
    zIndex: 10,
  },
  centerPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menuTrigger: {
    marginLeft: 12,
    padding: 4,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  manualEntryRow: {
    marginBottom: 20,
  },
  manualEntryInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  manualStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  removeStopButton: {
    padding: 8,
  },
  addManualStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  confirmManualButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rideTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rideTimeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideTimeSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideTimeDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimePickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  dateTimeButtonContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  manualEditContainer: {
    marginTop: 4,
  },
  manualEditInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  manualEditActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  manualEditSaveButton: {
    padding: 6,
    borderRadius: 16,
  },
  manualEditCancelButton: {
    padding: 6,
    borderRadius: 16,
  },
  detailsPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 20,
  },
  detailsPanelContent: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  detailsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  detailsPanelScrollView: {
    maxHeight: '100%',
  },
  detailsPanelScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  closeDetailsButton: {
    padding: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  detailContent: {
    flex: 1,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  addStopButtonDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  distanceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  myLocationButtonContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  myLocationButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  viewModeButtonContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  viewModeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  destinationsPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 15,
  },
  destinationsPanelContent: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  destinationIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  destinationContent: {
    flex: 1,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  confirmButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 15,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonContent: {
    alignItems: 'center',
  },
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addStopButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 15,
  },
  addStopButtonOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  routeLoadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
