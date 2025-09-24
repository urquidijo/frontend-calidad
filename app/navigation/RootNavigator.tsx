import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/src/store/auth";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SelectSchoolScreen from "../screens/SelectSchoolScreen";
import VerifyStudentScreen from "../screens/VerifyStudentScreen";
import TrackChildScreen from "../screens/TrackChildScreen"; // <-- agregar import
import MapScreen from "../screens/MapScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  SelectSchool: { prefill?: string } | undefined;
  VerifyStudent: { schoolId: string; schoolName: string };
  TrackChild: { childId: string }; // <-- nuevo route param
  Map:
    | {
        routeCoordinates?: { latitude: number; longitude: number }[];
        busPosition?: { latitude: number; longitude: number };
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { token, isLoading, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoading) return null; // splash simple

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
