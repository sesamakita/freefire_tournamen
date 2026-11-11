import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arenatarung.panitia',
  appName: 'Arena Tarung Panitia',
  webDir: 'build/client',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
