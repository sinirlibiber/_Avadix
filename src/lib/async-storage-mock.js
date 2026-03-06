// Mock for @react-native-async-storage/async-storage
// Required because MetaMask SDK pulls this in but we're in a browser environment

const AsyncStorage = {
  getItem: async () => null,
  setItem: async () => null,
  removeItem: async () => null,
  clear: async () => null,
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => null,
  multiRemove: async () => null,
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
