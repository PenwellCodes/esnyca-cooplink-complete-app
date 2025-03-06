import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@onboarding_complete';

export const useOnboarding = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    checkIfFirstLaunch();
  }, []);

  const checkIfFirstLaunch = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setIsFirstLaunch(value === null);
    } catch (error) {
      setIsFirstLaunch(true);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'completed');
      setIsFirstLaunch(false);
    } catch (error) {
      console.log('Error saving onboarding state:', error);
    }
  };

  return { isFirstLaunch, completeOnboarding };
};
