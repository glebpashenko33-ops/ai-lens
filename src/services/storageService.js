import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: 'anthropic_api_key',
  LAST_PROFILE: 'last_profile',
  LAST_ANALYSIS: 'last_analysis',
};

export const storageService = {
  async getApiKey() {
    try {
      return await AsyncStorage.getItem(KEYS.API_KEY);
    } catch {
      return null;
    }
  },

  async saveApiKey(key) {
    try {
      await AsyncStorage.setItem(KEYS.API_KEY, key);
    } catch {}
  },

  async getLastProfile() {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_PROFILE);
    } catch {
      return null;
    }
  },

  async saveLastProfile(profileName) {
    try {
      await AsyncStorage.setItem(KEYS.LAST_PROFILE, profileName);
    } catch {}
  },

  async getLastAnalysis() {
    try {
      const data = await AsyncStorage.getItem(KEYS.LAST_ANALYSIS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveLastAnalysis(profileName) {
    try {
      await AsyncStorage.setItem(
        KEYS.LAST_ANALYSIS,
        JSON.stringify({ profile: profileName, timestamp: Date.now() })
      );
    } catch {}
  },
};
