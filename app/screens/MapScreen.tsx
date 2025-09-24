// screens/MapScreen.tsx
import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

type Coord = { latitude: number; longitude: number };

type Props = {
  routeCoordinates?: Coord[];
  busPosition?: Coord | null;
  initialCenter?: Coord;
};

export default function MapScreen({ routeCoordinates, busPosition, initialCenter }: Props) {
  const mapRef = useRef<MapView | null>(null);

  const santaCruzCenter = initialCenter ?? { latitude: -17.7833, longitude: -63.1821 };
  const initialRegion = {
    ...santaCruzCenter,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  const fitToAll = () => {
    const coords: Coord[] = [];
    if (routeCoordinates && routeCoordinates.length) coords.push(...routeCoordinates);
    if (busPosition) coords.push(busPosition);
    if (coords.length > 0 && mapRef.current) {
      setTimeout(() => {
        // REDUCIDO bottom padding para que no deje tanto espacio debajo
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
    // omitimos el safe inset bottom para que el mapa llegue hasta la parte inferior
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map} // ocupa todo con absoluteFillObject
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor={polylineColor} lineCap="round" />
        )}

        {busPosition && (
          <Marker coordinate={busPosition} title="Bus" description="Posición actual">
            <View style={styles.busMarker}>
              <Text style={styles.busMarkerTxt}>🚌</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Controles flotando sobre el mapa (no cambian el tamaño del mapa) */}
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
  map: {
    ...StyleSheet.absoluteFillObject, // ocupa TODO el contenedor SafeAreaView
  },
  controls: {
    position: "absolute",
    right: 12,
    bottom: 24,
    flexDirection: "column",
    gap: 8,
  },
  btn: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  btnTxt: { color: "#12254A", fontWeight: "800" },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5EAF3",
  },
  busMarkerTxt: { fontSize: 18 },
});
