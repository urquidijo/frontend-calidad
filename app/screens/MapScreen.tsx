// screens/MapScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { api } from "../../src/lib/api";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Coord = {
  latitude: number;
  longitude: number;
  nombre?: string;
  estudianteId?: number;
};

type MapRoute = RouteProp<RootStackParamList, "Map">;

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const route = useRoute<MapRoute>();

  const routeCoordinates: Coord[] = route.params?.routeCoordinates ?? [];
  const initialBusPos: Coord | null = route.params?.busPosition ?? null;
  const childId = route.params?.childId;
  const busId = route.params?.busId;

  const [busPosition, setBusPosition] = useState<Coord | null>(initialBusPos);
  const [status, setStatus] = useState<string>("");

  const santaCruzCenter = { latitude: -17.7833, longitude: -63.1821 };
  const initialRegion = {
    ...santaCruzCenter,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  // 🔹 Escuchar la ubicación real del backend y reflejar en el mapa
  useEffect(() => {
    if (!busId) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/buses/${busId}/location`);
        if (data?.location) {
          setBusPosition({
            latitude: data.location.lat,
            longitude: data.location.lon,
          });
          setStatus(data.location.status ?? "");
        }
      } catch (err) {
        console.warn("Error fetching bus location:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [busId]);

  // 🔹 Centrar mapa
  const fitToAll = () => {
    const coords: Coord[] = [];
    if (routeCoordinates.length) coords.push(...routeCoordinates);
    if (busPosition) coords.push(busPosition);
    if (coords.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }, 250);
    } else {
      mapRef.current?.animateToRegion(initialRegion, 400);
    }
  };

  const polylineColor = useMemo(() => "#3557F5", []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 🔹 Banner de estado */}
      <View style={styles.statusBanner}>
        <Text style={styles.statusText}>
          {status === "EN_RUTA"
            ? "🟢 El bus está en camino"
            : status === "EN_COLEGIO"
            ? "🏫 El bus llegó al colegio"
            : "⏸️ Ruta no iniciada"}
        </Text>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
      >
        {/* Línea de la ruta */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor={polylineColor}
            lineCap="round"
          />
        )}

        {/* Paradas */}
        {routeCoordinates.map((p, idx) => {
          const isChild = p.estudianteId === childId;
          return (
            <Marker
              key={idx}
              coordinate={p}
              title={
                isChild ? `⭐ Casa de tu hijo` : p.nombre ?? `Parada ${idx + 1}`
              }
              description={isChild ? "Aquí espera tu hijo" : "Casa estudiante"}
              pinColor={isChild ? "gold" : "red"}
            />
          );
        })}

        {/* Bus */}
        {busPosition && (
          <Marker
            coordinate={busPosition}
            title="Bus"
            description="Posición actual"
          >
            <View style={styles.busMarker}>
              <Text style={styles.busMarkerTxt}>🚌</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={fitToAll}>
          <Text style={styles.btnTxt}>Centrar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB" },
  map: { ...StyleSheet.absoluteFillObject },
  controls: {
    position: "absolute",
    right: 12,
    bottom: 24,
  },
  btn: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  btnTxt: { color: "#12254A", fontWeight: "800" },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#E5EAF3",
  },
  busMarkerTxt: { fontSize: 20 },
  statusBanner: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 99,
  },
  statusText: { fontWeight: "700", color: "#12254A" },
});
