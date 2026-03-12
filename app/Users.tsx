import IconApp from '@/src/components/app/IconApp';
import ModalApp from '@/src/components/app/ModalApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { remote_url } from '@/src/constants/Constants';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setShowModalApp } from '@/src/store/reducers/appSlice';
import { TUserData } from '@/src/Types';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Users() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const userData = useAppSelector(state => state.persisted_app.user_data);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [users, setUsers] = useState<TUserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<TUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState<{ titleKey: string; descriptionKey: string } | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: t('admin.users') || 'Users',
    });
  }, [navigation, t]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    if (!userData || !userData._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const getAdminDataUrl = `${remote_url}/payall/API/get_admin_data`;
      const apiResponse = await axios.post(getAdminDataUrl, {
        user_id: userData._id,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (apiResponse.data && apiResponse.data.success === '1') {
        setUsers(apiResponse.data.users || []);
      } else {
        setModalError({
          titleKey: 'error',
          descriptionKey: apiResponse.data?.error || 'error.fetchRidesErrorDescriptionGeneric',
        });
        dispatch(setShowModalApp(true));
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      if (error.response) {
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: error.response.data?.error || 'error.fetchRidesErrorDescriptionGeneric',
        });
      } else if (error.request) {
        setModalError({
          titleKey: 'error.networkError',
          descriptionKey: 'error.networkErrorDescription',
        });
      } else {
        setModalError({
          titleKey: 'error.fetchRidesError',
          descriptionKey: 'error.fetchRidesErrorDescriptionGeneric',
        });
      }
      dispatch(setShowModalApp(true));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.names.toLowerCase().includes(query) ||
      user.user_email.toLowerCase().includes(query) ||
      (user.phone_numbers && user.phone_numbers.some(phone => phone.includes(query)))
    );
    setFilteredUsers(filtered);
  };

  const getAccountTypeText = (accountType: number): string => {
    switch (accountType) {
      case 0: return t('settings.customer');
      case 1: return t('settings.driver');
      case 2: return t('admin.admin');
      default: return t('admin.unknown');
    }
  };

  if (loading) {
    return (
      <AppView style={styles.container}>
        <StatusBarApp />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <AppText
            text={t('loading')}
            size="medium"
            styles={{ color: themeColors.gray, marginTop: 12 }}
          />
        </View>
      </AppView>
    );
  }

  const renderUserItem = ({ item: user }: { item: TUserData }) => (
    <Pressable
      onPress={() => {
        router.push({ pathname: '/User', params: { userId: user._id } } as any);
      }}
      style={({ pressed }) => [
        styles.userCard,
        {
          backgroundColor: theme === 'light' 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'rgba(0, 0, 0, 0.85)',
          borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <BlurView
        intensity={80}
        tint={theme === 'light' ? 'light' : 'dark'}
        style={styles.userCardContent}
      >
        <AppText
          text={user.names}
          size="medium"
          bold
          styles={{ color: themeColors.text, marginBottom: 4 }}
        />
        <AppText
          text={user.user_email}
          size="small"
          styles={{ color: themeColors.gray, marginBottom: 4 }}
        />
        {user.phone_numbers && user.phone_numbers.length > 0 && (
          <AppText
            text={user.phone_numbers.join(', ')}
            size="small"
            styles={{ color: themeColors.gray, marginBottom: 8 }}
          />
        )}
        <View style={[
          styles.accountTypeBadge,
          { backgroundColor: themeColors.primary + '15' },
        ]}>
          <AppText
            text={getAccountTypeText(user.account_type)}
            size="small"
            bold
            styles={{ color: themeColors.primary }}
          />
        </View>
      </BlurView>
    </Pressable>
  );

  const showSearch = users.length > 1;

  const renderListEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconApp
        pack="FI"
        name="users"
        size={64}
        color={themeColors.gray}
        styles={{ marginBottom: 16 }}
      />
      <AppText
        i18nKey="admin.noUsers"
        size="medium"
        styles={{ color: themeColors.gray, textAlign: 'center', marginBottom: 20 }}
      />
      <Pressable
        onPress={onRefresh}
        style={({ pressed }) => [
          styles.retryButton,
          {
            backgroundColor: themeColors.primary,
            opacity: pressed ? 0.7 : 1,
          }
        ]}
      >
        <AppText
          i18nKey="retry"
          size="normal"
          bold
          styles={{ color: '#FFFFFF' }}
        />
      </Pressable>
    </View>
  );

  return (
    <AppView style={styles.container}>
      <StatusBarApp />

      {/* Floating Search Bar - Only show if more than one user */}
      {showSearch && (
        <AppView style={[
          styles.searchContainer,
          {
            top: 15,
            backgroundColor: theme === 'light' ? '#F8F9FA' : '#2C2C2E',
            borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)',
          }
        ]}>
          <IconApp 
            pack="FI" 
            name="search" 
            size={16} 
            color={themeColors.gray} 
            styles={{ marginRight: 12 }} 
          />
          <TextInput
            placeholder={t('admin.searchUsers')}
            placeholderTextColor={themeColors.gray}
            style={[
              styles.searchInput,
              {
                color: themeColors.text,
              }
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable 
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [
                styles.clearButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconApp 
                pack="FI" 
                name="x" 
                size={14} 
                color={themeColors.gray} 
                styles={{}} 
              />
            </Pressable>
          )}
        </AppView>
      )}

      <FlashList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={renderListEmpty}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingBottom: 20 + insets.bottom,
            paddingTop: showSearch ? 50 + insets.top : 20 + insets.top,
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Error Modal */}
      {modalError && (
        <ModalApp
          titleKey={modalError.titleKey}
          descriptionKey={modalError.descriptionKey}
          singleButton={true}
          textCancelKey="close"
          onClose={() => {
            setModalError(null);
            dispatch(setShowModalApp(false));
          }}
        >
          <View />
        </ModalApp>
      )}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 15,
  },
  searchContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  userCard: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  userCardContent: {
    padding: 16,
  },
  accountTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
});

