import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import ModalSheet from '@/src/components/app/ModalSheet';
import StatusBarApp from '@/src/components/app/StatusBar';
import SwitchApp from '@/src/components/app/SwitchApp';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import cities from '@/src/constants/Cities.json';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { setUserData } from '@/src/store/reducers/persistedAppSlice';
import { TUserData } from '@/src/Types';
import axios from 'axios';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UpdateUser() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();

  const isAdmin = userData?.account_type === 2 || userData?.is_admin === true;
  const targetUserId = (params.userId as string) || userData?._id;
  const isEditingOwnProfile = targetUserId === userData?._id;
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUser, setLoadingUser] = useState(!isEditingOwnProfile);

  const [names, setNames] = useState(isEditingOwnProfile ? (userData?.names || '') : '');
  const [gender, setGender] = useState(isEditingOwnProfile ? (userData?.gender || 0) : 0);
  const [country, setCountry] = useState(isEditingOwnProfile ? (userData?.country || '') : '');
  const [city, setCity] = useState(isEditingOwnProfile ? (userData?.city || '') : '');
  const [state, setState] = useState(isEditingOwnProfile ? (userData?.state || '') : '');
  const [showCityModal, setShowCityModal] = useState(false);
  const [address, setAddress] = useState(isEditingOwnProfile ? (userData?.address || '') : '');
  // account_type (0=customer, 1=driver) and is_admin are independent
  const [accountType, setAccountType] = useState(isEditingOwnProfile ? (userData?.account_type ?? 0) : 0);
  const [isAdminFlag, setIsAdminFlag] = useState(isEditingOwnProfile ? (userData?.is_admin ?? false) : false);
  const [carModel, setCarModel] = useState(isEditingOwnProfile ? (userData?.car_model || '') : '');
  const [carCondition, setCarCondition] = useState(isEditingOwnProfile ? (userData?.car_condition ?? 0) : 0);
  const [licensePlate, setLicensePlate] = useState(isEditingOwnProfile ? (userData?.license_plate || '') : '');
  const [carNumber, setCarNumber] = useState(isEditingOwnProfile ? (userData?.car_number || '') : '');
  const [insuranceDetails, setInsuranceDetails] = useState(isEditingOwnProfile ? (userData?.insurance_details || '') : '');
  const [insuranceNumber, setInsuranceNumber] = useState(isEditingOwnProfile ? (userData?.insurance_number || '') : '');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(
    isEditingOwnProfile && userData?.phone_numbers && userData.phone_numbers.length > 0
      ? userData.phone_numbers
      : ['']
  );
  const [emails, setEmails] = useState<string[]>(
    isEditingOwnProfile && userData?.user_emails && userData.user_emails.length > 0
      ? userData.user_emails
      : isEditingOwnProfile && userData?.user_email
        ? [userData.user_email]
        : ['']
  );
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ title: string; message: string } | null>(null);

  const showModal = (title: string, message: string) => {
    setModalMessage({ title, message });
    dispatch(setShowModalApp(true));
  };

  useEffect(() => {
    navigation.setOptions({
      title: t('updateUser.title'),
      // iOS-only: set a friendly back button label
      ...(Platform.OS === 'ios'
        ? { headerBackTitle: t('settings.title') }
        : {}),
    });
  }, [navigation, t]);

  const fetchUserData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh && !isEditingOwnProfile) {
        setLoadingUser(true);
      }

      const getUserUrl = `${remote_url}/payall/API/get_user`;
      const apiResponse = await axios.post(getUserUrl, {
        user_id: targetUserId,
        requested_by: userData?._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
        const fetchedUser = apiResponse.data.user as TUserData;

        // Update all state with fetched user data
        setNames(fetchedUser.names || '');
        setGender(fetchedUser.gender ?? 0);
        setCountry(fetchedUser.country || '');
        setCity(fetchedUser.city || '');
        setState(fetchedUser.state || '');
        setAddress(fetchedUser.address || '');
        setAccountType(fetchedUser.account_type ?? 0);
        setIsAdminFlag(fetchedUser.is_admin ?? false);
        setCarModel(fetchedUser.car_model || '');
        setCarCondition(fetchedUser.car_condition ?? 0);
        setLicensePlate(fetchedUser.license_plate || '');
        setCarNumber(fetchedUser.car_number || '');
        setInsuranceDetails(fetchedUser.insurance_details || '');
        setInsuranceNumber(fetchedUser.insurance_number || '');
        setPhoneNumbers(
          fetchedUser.phone_numbers && fetchedUser.phone_numbers.length > 0
            ? fetchedUser.phone_numbers
            : ['']
        );
        setEmails(
          fetchedUser.user_emails && fetchedUser.user_emails.length > 0
            ? fetchedUser.user_emails
            : fetchedUser.user_email
              ? [fetchedUser.user_email]
              : ['']
        );

        // Update Redux store if editing own profile
        if (isEditingOwnProfile) {
          dispatch(setUserData(fetchedUser));
        }
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingUser(false);
    }
  }, [targetUserId, userData?._id, isEditingOwnProfile, dispatch]);

  useEffect(() => {
    if (targetUserId) {
      fetchUserData();
    }
  }, [targetUserId, fetchUserData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData(true);
    setRefreshing(false);
  }, [fetchUserData]);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return false;
    // Basic phone validation - at least 8 digits
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  };

  const handleAddPhone = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const handleRemovePhone = (index: number) => {
    // Prevent deletion of the first phone number (primary)
    if (index === 0) {
      showModal(
        t('error'),
        t('updateUser.cannotDeletePrimary')
      );
      return;
    }
    if (phoneNumbers.length > 1) {
      const newPhones = phoneNumbers.filter((_, i) => i !== index);
      setPhoneNumbers(newPhones);
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phoneNumbers];
    newPhones[index] = value;
    setPhoneNumbers(newPhones);
  };

  const handleAddEmail = () => {
    setEmails([...emails, '']);
  };

  const handleRemoveEmail = (index: number) => {
    // Prevent deletion of the first email address (primary account email)
    if (index === 0) {
      showModal(
        t('error'),
        t('updateUser.cannotDeletePrimaryEmail')
      );
      return;
    }
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSave = async () => {
    // Validate
    const validPhones = phoneNumbers.filter(p => p.trim() !== '');
    const validEmails = emails.filter(e => e.trim() !== '');

    // Validate all emails
    for (const email of validEmails) {
      if (!validateEmail(email)) {
        showModal(t('error'), t('updateUser.invalidEmail'));
        return;
      }
    }

    // Validate all phones
    for (const phone of validPhones) {
      if (!validatePhone(phone)) {
        showModal(t('error'), t('updateUser.invalidPhone'));
        return;
      }
    }

    if (!names.trim()) {
      showModal(t('error'), t('updateUser.names'));
      return;
    }

    // Validate driver details if they are a driver
    if (accountType === 1) {
      if (!carModel.trim()) {
        showModal(t('error'), t('becomeDriver.carModelRequired'));
        return;
      }
      if (!licensePlate.trim()) {
        showModal(t('error'), t('becomeDriver.licenseRequired'));
        return;
      }
      if (!carNumber.trim()) {
        showModal(t('error'), t('becomeDriver.carNumberRequired'));
        return;
      }
      if (!insuranceDetails.trim()) {
        showModal(t('error'), t('becomeDriver.insuranceDetailsRequired'));
        return;
      }
      if (!insuranceNumber.trim()) {
        showModal(t('error'), t('becomeDriver.insuranceNumberRequired'));
        return;
      }
    }

    try {
      setLoading(true);
      const updateUserUrl = `${remote_url}/payall/API/update_user`;
      const updatePayload: any = {
        user: {
          _id: targetUserId,
          names: names.trim(),
          gender,
          country: country.trim(),
          city: city.trim(),
          state: state.trim(),
          address: address.trim(),
          phone_numbers: validPhones, // Array of phone numbers
          user_email: validEmails[0] || '', // Primary email for backward compatibility
          user_emails: validEmails, // Array of emails
        },
      };

      // Add account type and admin flag
      updatePayload.user.account_type = accountType;
      updatePayload.user.is_admin = isAdminFlag;

      // Add car information if user is a driver
      if (accountType === 1) {
        updatePayload.user.car_model = carModel.trim();
        updatePayload.user.car_condition = carCondition;
        updatePayload.user.license_plate = licensePlate.trim();
        updatePayload.user.car_number = carNumber.trim();
        updatePayload.user.insurance_details = insuranceDetails.trim();
        updatePayload.user.insurance_number = insuranceNumber.trim();
        // Clear pending driver request flag since they are now a driver
        updatePayload.user.ask_become_driver = false;
      } else {
        // Just clear the request review flag so they are no longer in pending status
        updatePayload.user.ask_become_driver = false;
      }

      const apiResponse = await axios.post(updateUserUrl, updatePayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1' && apiResponse.data.user) {
        // Update Redux store only if editing own profile
        if (isEditingOwnProfile) {
          dispatch(setUserData(apiResponse.data.user as TUserData));
        }
        setShowSuccessModal(true);
        dispatch(setShowModalApp(true));
      } else {
        showModal(
          t('error'),
          t('updateUser.updateFailed')
        );
      }
    } catch (error: any) {
      console.error('Update User Error:', error);
      showModal(
        t('error'),
        t('updateUser.updateFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      {loadingUser ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText
            text={t('loading')}
            size="medium"
            styles={{ color: themeColors.gray, marginTop: 12 }}
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[themeColors.primary]}
                tintColor={themeColors.primary}
              />
            }
          >
            {/* Admin Controls (only visible to admins) */}
            {isAdmin && (
              <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
                {/* <AppText size="normal" bold text={t('updateUser.adminControls')} styles={{ marginBottom: 12, color: themeColors.text }} /> */}

                {/* Driver Toggle */}
                <View style={styles.inputGroup}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <AppText size="normal" bold text={t('updateUser.makeDriver')} styles={{ marginBottom: 4, color: themeColors.text }} />
                      <AppText size="small" text={t('updateUser.driverDescription')} styles={{ color: themeColors.gray }} />
                    </View>
                    <SwitchApp
                      value={accountType === 1}
                      color={themeColors.primary}
                      onPress={(next: boolean) => {
                        setAccountType(next ? 1 : 0);
                      }}
                    />
                  </View>
                </View>

                {/* Admin Toggle */}
                <View style={styles.inputGroup}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <AppText size="normal" bold text={t('updateUser.makeAdmin')} styles={{ marginBottom: 4, color: themeColors.text }} />
                      <AppText size="small" text={t('updateUser.adminDescription')} styles={{ color: themeColors.gray }} />
                    </View>
                    <SwitchApp
                      value={isAdminFlag}
                      color={themeColors.primary}
                      onPress={(next: boolean) => {
                        setIsAdminFlag(next);
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Basic Information */}
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
              {/* <AppText size="normal" bold text={t('updateUser.title')} styles={{ marginBottom: 12, color: themeColors.text }} /> */}

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <AppText size="normal" bold text={t('updateUser.names')} styles={{ marginBottom: 8, color: themeColors.text }} />
                <TextInput
                  value={names}
                  onChangeText={setNames}
                  placeholder={t('updateUser.names')}
                  placeholderTextColor={themeColors.gray}
                  style={[
                    styles.input,
                    {
                      color: themeColors.text,
                      backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                      borderColor: themeColors.border,
                    }
                  ]}
                />
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <AppText size="normal" bold text={t('updateUser.gender')} styles={{ marginBottom: 8, color: themeColors.text }} />
                <View style={styles.genderContainer}>
                  {[0, 1].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setGender(value)}
                      style={({ pressed }) => [
                        styles.genderOption,
                        {
                          backgroundColor: gender === value ? themeColors.primary : (theme === 'light' ? '#F8F9FA' : '#2C2C2E'),
                          borderColor: gender === value ? themeColors.primary : themeColors.border,
                          opacity: pressed ? 0.7 : 1,
                        }
                      ]}
                    >
                      <AppText
                        color={gender === value ? themeColors.primaryForeground : themeColors.text}
                        size="normal"
                        bold={gender === value}
                        text={
                          value === 0 ? (t('updateUser.male')) :
                            (t('updateUser.female'))
                        }
                        styles={{ color: gender === value ? '#FFFFFF' : themeColors.text }}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Address Fields */}
              <View style={styles.inputGroup}>
                <AppText size="normal" bold text={t('updateUser.address')} styles={{ marginBottom: 8, color: themeColors.text }} />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t('updateUser.address')}
                  placeholderTextColor={themeColors.gray}
                  style={[
                    styles.input,
                    {
                      color: themeColors.text,
                      backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                      borderColor: themeColors.border,
                    }
                  ]}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <AppText size="normal" bold text={t('updateUser.city')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <Pressable
                    onPress={() => setShowCityModal(true)}
                    style={({ pressed }) => [
                      styles.input,
                      {
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                        justifyContent: 'center',
                        paddingHorizontal: 12,
                        opacity: pressed ? 0.7 : 1,
                      }
                    ]}
                  >
                    <AppText
                      text={city || t('updateUser.selectCity')}
                      styles={{ color: city ? themeColors.text : themeColors.gray }}
                    />
                  </Pressable>
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <AppText size="normal" bold text={t('updateUser.state')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <TextInput
                    value={state}
                    onChangeText={setState}
                    placeholder={t('updateUser.state')}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.input,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <AppText size="normal" bold text={t('updateUser.country')} styles={{ marginBottom: 8, color: themeColors.text }} />
                <TextInput
                  value={country}
                  onChangeText={setCountry}
                  placeholder={t('updateUser.country')}
                  placeholderTextColor={themeColors.gray}
                  style={[
                    styles.input,
                    {
                      color: themeColors.text,
                      backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                      borderColor: themeColors.border,
                    }
                  ]}
                />
              </View>
            </View>

            {/* Phone Numbers */}
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
              <View style={styles.sectionHeader}>
                <AppText size="normal" bold text={t('updateUser.phoneNumbers')} styles={{ color: themeColors.text }} />
                <Pressable
                  onPress={handleAddPhone}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      backgroundColor: themeColors.primary,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <IconApp pack="FI" name="plus" size={14} color={themeColors.primaryForeground} />
                  <AppText size="small" color={themeColors.primaryForeground} bold text={t('updateUser.addPhone')} styles={{ color: themeColors.primaryForeground, marginLeft: 4 }} />
                </Pressable>
              </View>

              {phoneNumbers.map((phone, index) => (
                <View key={index} style={styles.listItem}>
                  <TextInput
                    value={phone}
                    onChangeText={(value) => handlePhoneChange(index, value)}
                    placeholder={t('updateUser.enterPhone')}
                    placeholderTextColor={themeColors.gray}
                    keyboardType="phone-pad"
                    style={[
                      styles.listInput,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                  {phoneNumbers.length > 1 && index !== 0 && (
                    <Pressable
                      onPress={() => handleRemovePhone(index)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        {
                          backgroundColor: themeColors.error + '15',
                          borderColor: themeColors.error,
                          opacity: pressed ? 0.7 : 1,
                        }
                      ]}
                    >
                      <IconApp pack="FI" name="x" size={14} color={themeColors.error} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            {/* Email Addresses */}
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
              <View style={styles.sectionHeader}>
                <AppText size="normal" bold text={t('updateUser.emails')} styles={{ color: themeColors.text }} />
                <Pressable
                  onPress={handleAddEmail}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      backgroundColor: themeColors.primary,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <IconApp pack="FI" name="plus" size={14} color={themeColors.primaryForeground} />
                  <AppText size="small" color={themeColors.primaryForeground} bold text={t('updateUser.addEmail')} styles={{ marginLeft: 4 }} />
                </Pressable>
              </View>

              {emails.map((email, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={email}
                      onChangeText={(value) => handleEmailChange(index, value)}
                      placeholder={t('updateUser.enterEmail')}
                      placeholderTextColor={themeColors.gray}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={index !== 0}
                      style={[
                        styles.listInput,
                        {
                          color: themeColors.text,
                          backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                          borderColor: themeColors.border,
                          opacity: index === 0 ? 0.7 : 1,
                        }
                      ]}
                    />
                    {index === 0 && (
                      <AppText
                        size="small"
                        text={t('updateUser.primaryEmail')}
                        styles={{
                          color: themeColors.gray,
                          marginTop: 4,
                          fontStyle: 'italic',
                          fontSize: 12
                        }}
                      />
                    )}
                  </View>
                  {emails.length > 1 && index !== 0 && (
                    <Pressable
                      onPress={() => handleRemoveEmail(index)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        {
                          backgroundColor: themeColors.error + '15',
                          borderColor: themeColors.error,
                          opacity: pressed ? 0.7 : 1,
                        }
                      ]}
                    >
                      <IconApp pack="FI" name="x" size={14} color={themeColors.error} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            {/* Car Information (for drivers only) */}
            {accountType === 1 && (
              <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFFFFF' : '#1C1C1E', borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)' }]}>
                <AppText size="normal" bold text={t('updateUser.carInformation')} styles={{ marginBottom: 12, color: themeColors.text }} />

                {/* Car Model */}
                <View style={styles.inputGroup}>
                  <AppText size="normal" bold text={t('updateUser.carModel')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <TextInput
                    value={carModel}
                    onChangeText={setCarModel}
                    placeholder={t('updateUser.enterCarModel')}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.input,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                </View>

                {/* Car Condition */}
                <View style={styles.inputGroup}>
                  <AppText size="normal" bold text={t('updateUser.carCondition')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <View style={styles.genderContainer}>
                    {[0, 1, 2].map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setCarCondition(value)}
                        style={({ pressed }) => [
                          styles.genderOption,
                          {
                            backgroundColor: carCondition === value ? themeColors.primary : (theme === 'light' ? '#F8F9FA' : '#2C2C2E'),
                            borderColor: carCondition === value ? themeColors.primary : themeColors.border,
                            opacity: pressed ? 0.7 : 1,
                          }
                        ]}
                      >
                        <AppText
                          color={carCondition === value ? themeColors.primaryForeground : themeColors.text}
                          size="normal"
                          bold={carCondition === value}
                          text={
                            value === 0 ? (t('updateUser.excellent')) :
                              value === 1 ? (t('updateUser.good')) :
                                (t('updateUser.poor'))
                          }
                          styles={{ color: carCondition === value ? '#FFFFFF' : themeColors.text }}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* License Plate */}
                <View style={styles.inputGroup}>
                  <AppText size="normal" bold text={t('updateUser.licensePlate')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <TextInput
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    placeholder={t('updateUser.enterLicensePlate')}
                    placeholderTextColor={themeColors.gray}
                    autoCapitalize="characters"
                    style={[
                      styles.input,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                </View>

                {/* Car Number */}
                <View style={styles.inputGroup}>
                  <AppText size="normal" bold text={t('becomeDriver.carNumber')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <TextInput
                    value={carNumber}
                    onChangeText={setCarNumber}
                    placeholder={t('becomeDriver.enterCarNumber')}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.input,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                </View>

                {/* Insurance Details */}
                <View style={styles.inputGroup}>
                  <AppText size="normal" bold text={t('becomeDriver.insuranceDetails')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <TextInput
                    value={insuranceDetails}
                    onChangeText={setInsuranceDetails}
                    placeholder={t('becomeDriver.enterInsuranceDetails')}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.input,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                </View>

                {/* Insurance Number */}
                <View style={styles.inputGroup}>
                  <AppText size="normal" bold text={t('becomeDriver.insuranceNumber')} styles={{ marginBottom: 8, color: themeColors.text }} />
                  <TextInput
                    value={insuranceNumber}
                    onChangeText={setInsuranceNumber}
                    placeholder={t('becomeDriver.enterInsuranceNumber')}
                    placeholderTextColor={themeColors.gray}
                    style={[
                      styles.input,
                      {
                        color: themeColors.text,
                        backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
                        borderColor: themeColors.border,
                      }
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Save Button */}
            <AppButton
              i18nKey="updateUser.save"
              onPress={handleSave}
              loadEnabled={loading}
              styles={styles.saveButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <ModalApp
          titleKey="updateUser.updateSuccess"
          descriptionKey="updateUser.updateSuccessDescription"
          singleButton={true}
          textCancelKey="close"
          onClose={() => {
            setShowSuccessModal(false);
            dispatch(setShowModalApp(false));
            router.back();
          }}
        >
          <View />
        </ModalApp>
      )}

      {/* Info/Error Message Modal */}
      {modalMessage && (
        <ModalApp
          title={modalMessage.title}
          description={modalMessage.message}
          singleButton={true}
          textCancelKey="close"
          onClose={() => {
            setModalMessage(null);
            dispatch(setShowModalApp(false));
          }}
        >
          <View />
        </ModalApp>
      )}

      <ModalSheet
        isPresented={showCityModal}
        onDismiss={() => setShowCityModal(false)}
      >
        <View style={{
          padding: 20,
          paddingBottom: insets.bottom + 20,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <AppText size="medium" bold text={t('updateUser.selectCity')} styles={{ color: themeColors.text }} />
            <Pressable onPress={() => setShowCityModal(false)}>
              <IconApp pack="FI" name="x" size={24} color={themeColors.text} />
            </Pressable>
          </View>
          <View style={{ gap: 12 }}>
            {cities.map((cityName) => (
              <Pressable
                key={cityName}
                onPress={() => {
                  setCity(cityName);
                  setShowCityModal(false);
                }}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2E',
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
              >
                <AppText size="medium" text={cityName} styles={{ color: themeColors.text }} />
                {city === cityName && (
                  <IconApp pack="FI" name="check" size={18} color={themeColors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </ModalSheet>
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  listInput: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

