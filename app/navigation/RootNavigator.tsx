import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/src/store/auth";

// Screens
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SelectSchoolScreen from "../screens/SelectSchoolScreen";
import VerifyStudentScreen from "../screens/VerifyStudentScreen";
import TrackChildScreen from "../screens/TrackChildScreen";
import MapScreen from "../screens/MapScreen";
import DriverScreen from "../screens/DriverScreen";

// 🔹 Definición de rutas y parámetros
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  SelectSchool: { prefill?: string } | undefined;
  VerifyStudent: { schoolId: string; schoolName: string };
  TrackChild: { childId: string };
  Driver: { busId: number }; // 🔹 nueva ruta para el conductor
  Map:
    | {
        routeCoordinates?: { latitude: number; longitude: number }[];
        busPosition?: { latitude: number; longitude: number };
        childId?: number;
        busId?: number;
        schoolStop?: { latitude: number; longitude: number; nombre?: string };
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { token, isLoading, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoading) return null; // 🔹 Splash simple

  return (
    <Stack.Navigator>
      {token ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="SelectSchool"
            component={SelectSchoolScreen}
            options={{ title: "Colegios afiliados" }}
          />

          <Stack.Screen
            name="VerifyStudent"
            component={VerifyStudentScreen}
            options={{ title: "Verificar estudiante" }}
          />

          <Stack.Screen
            name="TrackChild"
            component={TrackChildScreen}
            options={{ title: "Monitoreo del estudiante" }}
          />

          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{ title: "Mapa" }}
          />

          <Stack.Screen
            name="Driver"
            component={DriverScreen}
            options={{ title: "Conductor" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
