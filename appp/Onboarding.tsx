import AppButton from '@/src/components/app/AppButton';
import IconApp from '@/src/components/app/IconApp';
import StatusBarApp from '@/src/components/app/StatusBar';
import AppText from '@/src/components/app/Text';
import { AppView } from '@/src/components/app/ViewApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import ChangeLanguage from '@/src/lang/ChangeLanguage';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setTheme } from '@/src/store/reducers/persistedAppSlice';
import { Link, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  image: any;
  titleKey: string;
  descriptionKey: string;
}

interface OnboardingSlideProps {
  item: OnboardingStep;
  index: number;
  scrollX: Animated.SharedValue<number>;
  theme: string;
}

const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, index, scrollX, theme }) => {
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale: withSpring(scale) }],
      opacity: withTiming(opacity),
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, 50],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY: withSpring(translateY) }],
      opacity: withTiming(opacity),
    };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
        <LottieView
          source={item.image}
          autoPlay
          loop
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <AppText
          i18nKey={item.titleKey}
          size="big"
          bold
          styles={{ textAlign: 'center', marginBottom: 20, color: themeColors.text }}
        />
        <AppText
          i18nKey={item.descriptionKey}
          size="small"
          styles={{ textAlign: 'center', lineHeight: 24, color: themeColors.gray }}
          numberLines={4}
        />
      </Animated.View>
    </View>
  );
};

interface PaginationDotProps {
  isActive: boolean;
  theme: string;
}

const PaginationDot: React.FC<PaginationDotProps> = ({ isActive, theme }) => {
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const dotAnimatedStyle = useAnimatedStyle(() => {
    const scale = isActive ? withSpring(1.2) : withSpring(1);
    const opacity = isActive ? withTiming(1) : withTiming(0.4);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.paginationDot,
        {
          backgroundColor: isActive ? themeColors.text : themeColors.gray,
        },
        isActive && { width: 24 },
        dotAnimatedStyle,
      ]}
    />
  );
};

const Onboarding = () => {
  const router = useRouter();
  const theme = useAppSelector(state => state.persisted_app.theme);
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingStep>>(null);
  const scrollX = useSharedValue(0);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      image: require('./../src/assets/images/Onboarding1.json'),
      titleKey: 'onboarding.step1.title',
      descriptionKey: 'onboarding.step1.description',
    },
    {
      id: 2,
      image: require('./../src/assets/images/Onboarding2.json'),
      titleKey: 'onboarding.step2.title',
      descriptionKey: 'onboarding.step2.description',
    },
    {
      id: 3,
      image: require('./../src/assets/images/Onboarding3.json'),
      titleKey: 'onboarding.step3.title',
      descriptionKey: 'onboarding.step3.description',
    },
  ];

  const handleNext = () => {
    if (currentIndex < onboardingSteps.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push('/Signin');
    }
  };

  const handleSkip = () => {
    router.push('/Signin');
  };

  const handleScroll = (event: any) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderItem = ({ item, index }: { item: OnboardingStep; index: number }) => {
    return <OnboardingSlide item={item} index={index} scrollX={scrollX} theme={theme} />;
  };

  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  return (
    <AppView style={styles.container}>
      <StatusBarApp />

      {/* Skip Button - Hidden on last step */}
      {currentIndex < onboardingSteps.length - 1 && (
        <Animated.View
          entering={FadeIn.delay(300)}
          exiting={FadeOut.duration(200)}
          style={styles.skipButtonContainer}
        >
          <TouchableOpacity onPress={handleSkip}>
            <AppText
              i18nKey="skip"
              size="normal"
              styles={{ color: themeColors.text }}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Theme Toggle and Language Toggle */}
      <Animated.View
        entering={FadeIn.delay(400)}
        style={styles.controlsContainer}
      >
        <TouchableOpacity
          onPress={() => dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))}
          style={styles.controlButton}
        >
          <IconApp
            pack="FI"
            name={theme === 'dark' ? "sun" : "moon"}
            size={25}
            color={themeColors.text}
            styles={{}}
          />
        </TouchableOpacity>
        <View style={{ marginLeft: 15 }}>
          <ChangeLanguage />
        </View>
      </Animated.View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Pagination */}
      <Animated.View entering={FadeInUp.delay(500)}>
        <View style={styles.paginationContainer}>
          {onboardingSteps.map((_, index) => (
            <PaginationDot
              key={index}
              isActive={index === currentIndex}
              theme={theme}
            />
          ))}
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View
        entering={FadeInUp.delay(600)}
        style={styles.buttonContainer}
      >
        {currentIndex < onboardingSteps.length - 1 ? (
          <AppButton
            i18nKey="next"
            onPress={handleNext}
            styles={styles.button}
          />
        ) : (
          <Link href="/Signin" asChild>
            <AppButton
              i18nKey="getStarted"
              onPress={() => { }}
              styles={styles.button}
            />
          </Link>
        )}
      </Animated.View>
    </AppView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  controlsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    // Additional styling if needed
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 100,
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  button: {
    width: '100%',
  },
});

export default Onboarding;
