import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/src/components/app/AppButton';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppSelector } from '@/src/store/app/hooks';

const PowerPay = () => {
  const theme = useAppSelector(state => state.persisted_app.theme);
  const [app_theme, setApp_theme] = useState(theme === 'light' ? LightTheme : DarkTheme);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1); // 1: Form, 2: Operator Selection
  const [meterNumber, setMeterNumber] = useState('');
  const [units, setUnits] = useState('');

  const handleNext = () => {
    if (meterNumber && units) {
      setStep(2);
    } else {
      // Optional: validation feedback
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const alerteUser=()=>{
    Alert.alert("Information","L’utilisateur devra saisir ses coordonnées de paiement mobile ou de carte bancaire afin de valider la transaction. Si les fonds sont disponibles sur son compte mobile money ou sa carte bancaire, le montant sera immédiatement débité de son compte, et le numéro destiné à recevoir le paiement sera crédité dans la même seconde.")
  }

  return (
    <AppView style={styles.container}>
      <StatusBarApp />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText text="PowerPay" size="big" bold styles={{ marginVertical: 0 }} />

          {step === 1 ? (
            <Animated.View
              entering={FadeInLeft}
              exiting={FadeOutLeft}
              style={styles.content}
            >
              <AppText text="Numéro de compteur" size="medium" styles={styles.label} />
              <TextInput
                value={meterNumber}
                onChangeText={setMeterNumber}
                placeholder="Entrer le numéro"
                style={styles.input}
                keyboardType="numeric"
              />

              <AppText text="Unités à acheter" size="medium" styles={styles.label} />
              <TextInput
                value={units}
                onChangeText={setUnits}
                placeholder="Ex: 50"
                style={styles.input}
                keyboardType="numeric"
              />

              <AppButton title="Suivant" onPress={handleNext} />
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInRight}
              exiting={FadeOutRight}
              style={styles.content}
            >
              <AppText text="Choisissez un opérateur" size="medium" bold styles={{ marginBottom: 20 }} />

              <AppView style={styles.operatorsRow}>
                <TouchableOpacity  onPress={alerteUser}
                style={styles.operatorButton}>
                  <Image source={require('./../src/assets/images/mpesa.png')} style={styles.operatorImage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={alerteUser} style={styles.operatorButton}>
                  <Image source={require('./../src/assets/images/airtel.png')} style={styles.operatorImage} />
                </TouchableOpacity>
              </AppView>

              <AppView style={styles.operatorsRow}>
                <TouchableOpacity onPress={alerteUser} style={styles.operatorButton}>
                  <Image source={require('./../src/assets/images/orange.png')} style={styles.operatorImage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={alerteUser} style={styles.operatorButton}>
                  <Image source={require('./../src/assets/images/banque.jpg')} style={styles.operatorImage} />
                </TouchableOpacity>
              </AppView>

              {/* <AppButton title="Retour" onPress={handleBack} styles={{ marginTop: 30 }} /> */}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
    flexGrow: 1,
  },
  content: {
    width: '100%',
    marginTop: 30,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  operatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  operatorButton: {
    flex:1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'cover',
    borderRadius: 10
  },
});

export default PowerPay;
