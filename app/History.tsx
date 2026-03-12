// screens/History.tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';

import demoHistoryData from '@/src/constants/HistoryData';

const History = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    return demoHistoryData.filter(item =>
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <AppText text="Historique d'achats" size="big" bold styles={styles.title} />

      <TextInput
        placeholder="Rechercher par nom du client..."
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </AppView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingHorizontal: 20,
    // paddingTop: 40,
    // backgroundColor: '#fff',
  },
  title: {
    marginBottom: 20,
    marginHorizontal:15
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  list: {
    paddingBottom: 40,
    paddingHorizontal:15
  },
});

export default History;
