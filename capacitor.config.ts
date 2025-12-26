import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.afropitch.app',
    appName: 'AfroPitch',
    webDir: 'public',
    server: {
        androidScheme: 'https'
    }
};

export default config;
