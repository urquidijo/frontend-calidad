import type { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrlFromEnv = process.env.EXPO_PUBLIC_API_URL || config.extra?.API_URL;

  return {
    ...config,
    name: 'frontend-calidad',
    slug: 'frontend-calidad',
    version: '1.0.0',
    extra: {
      ...(config.extra || {}),
      API_URL: apiUrlFromEnv ?? 'https://backend-calidad-production.up.railway.app/api'
    },
    android: {
      ...(config.android || {}),
      // Cambia esto por tu package name. Formato recomendado: com.tuempresa.tuapp
      package: 'com.urquidijo.frontendcalidad'
    },
    ios: {
      ...(config.ios || {}),
      // Opcional por ahora, pero recomendable si piensas compilar iOS
      bundleIdentifier: 'com.urquidijo.frontendcalidad'
    }
  };
};
