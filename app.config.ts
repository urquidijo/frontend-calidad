import type { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Monitoreo-Escolar',
    slug: 'Monitoreo-Escolar',
    extra: { 
      API_URL: 'https://backend-calidad-production.up.railway.app/api'
     }

  };
};
//API_URL: 'http://localhost:3000/api'
//API_URL: 'https://backend-calidad-production.up.railway.app/api'