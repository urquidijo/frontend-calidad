// screens/TrackChildScreen.tsx
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../src/lib/api";

type BusResp = {
  id: number;
  codigo?: string;
  nombre?: string;
  placa?: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  status?: string | null;
  last_location?: { lat: number; lng: number; timestamp?: string } | null;
  colegioId?: number | null;
  route_coords?:
    | { id: number; nombre: string; lat: number; lng: number }[]
    | null;
  child_stop?: { id: number; nombre: string; lat: number; lng: number } | null;
  etaMinutes?: number | null;
};

type SchoolResp = {
  id: number;
  nombre: string;
  direccion?: string | null;
  lat?: number | null;
  lon?: number | null;
};

export default function TrackChildScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "TrackChild">>();
  const childId = Number(
    (route.params as { childId: string | number })?.childId
  );

  const [loading, setLoading] = useState(true);
  const [bus, setBus] = useState<BusResp | null>(null);
  const [school, setSchool] = useState<SchoolResp | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // NUEVA API
      const { data } = await api.get(`/students/${childId}/bus`);
      const fetchedBus = data?.bus ?? null;

      if (!fetchedBus) {
        setBus(null);
        setSchool(null);
        return;
      }

      const normalized: BusResp = {
        id: Number(fetchedBus.id),
        codigo: fetchedBus.codigo ?? fetchedBus.code ?? fetchedBus.id,
        nombre: fetchedBus.nombre,
        placa: fetchedBus.placa,
        driver_name: fetchedBus.driver_name ?? fetchedBus.conductor?.nombre ?? null,
        driver_phone: fetchedBus.driver_phone ?? fetchedBus.conductor?.telefono ?? null,
        status: fetchedBus.status ?? null,
        last_location: fetchedBus.last_location
          ? {
              lat: Number(fetchedBus.last_location.lat),
              // soporta lng o lon
              lng: Number(
                fetchedBus.last_location.lng ?? fetchedBus.last_location.lon
              ),
              timestamp: fetchedBus.last_location.timestamp,
            }
          : null,
        colegioId:
          fetchedBus.colegioId ??
          fetchedBus.schoolId ??
          fetchedBus.colegio?.id ??
          null,
        route_coords: Array.isArray(fetchedBus.route_coords)
          ? fetchedBus.route_coords.map((p: any) => ({
              id: Number(p.id),
              nombre: p.nombre ?? p.name,
              lat: Number(p.lat),
              // soporta lng o lon
              lng: Number(p.lng ?? p.lon),
            }))
          : null,
        child_stop: fetchedBus.child_stop ?? null,
        etaMinutes: fetchedBus.etaMinutes ?? null,
      };

      setBus(normalized);

      if (normalized.colegioId) {
        const { data: schoolData } = await api.get(
          `/schools/${normalized.colegioId}`
        );
        const s = schoolData?.school ?? schoolData?.item ?? schoolData;
        if (s) {
          setSchool({
            id: Number(s.id),
            nombre: s.nombre ?? s.name,
            direccion: s.direccion ?? s.address ?? null,
            lat: s.lat ?? null,
            lon: s.lon ?? null,
          });
        } else {
          setSchool(null);
        }
      } else {
        setSchool(null);
      }
    } catch (err) {
      console.warn("Error fetching child bus:", err);
      setBus(null);
      setSchool(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const callDriver = (phone?: string | null) => {
    if (!phone) {
      Alert.alert(
        "Teléfono no disponible",
        "El número del conductor no está registrado."
      );
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Error", "No se pudo iniciar la llamada.")
    );
  };

  const goToMap = () => {
    // Permite abrir mapa aunque no haya monitoreo (usa colegio/route si existen)
    const routeCoordinates =
      bus?.route_coords?.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
        nombre: p.nombre,
        estudianteId: p.id,
      })) ?? [];

    const busPosition = bus?.last_location
      ? { latitude: bus.last_location.lat, longitude: bus.last_location.lng }
      : null;

    const schoolPosition =
      school?.lat && school?.lon
        ? { latitude: Number(school.lat), longitude: Number(school.lon) }
        : null;

    if (!busPosition && !schoolPosition && routeCoordinates.length === 0) {
      Alert.alert(
        "Sin datos de mapa",
        "No hay ubicación del bus ni coordenadas del colegio o la ruta."
      );
      return;
    }

    nav.navigate("Map" as any, {
      routeCoordinates, // puede estar vacía
      busPosition, // puede ser null
      schoolPosition, // NUEVO: para que puedas mostrar el colegio
      busId: bus?.id ?? null,
      childId,
    } as any);
  };

  const openDirectionsToSchool = () => {
    if (!school?.lat || !school?.lon) {
      Alert.alert(
        "Ubicación no disponible",
        "Las coordenadas del colegio no están registradas."
      );
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${school.lat},${school.lon}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir la aplicación de mapas.")
    );
  };

  const renderStatus = (status?: string | null) => {
    switch (status) {
      case "EN_RUTA":
        return "🟢 En ruta hacia el colegio";
      case "EN_COLEGIO":
        return "🏫 Llegó al colegio";
      default:
        return "⏸️ Fuera de servicio";
    }
  };

  const canOpenMap = !!(
    (school?.lat && school?.lon) ||
    bus?.last_location ||
    (bus?.route_coords && bus?.route_coords.length > 0)
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.sub}>Cargando información del bus asignado…</Text>
        </View>
      ) : bus === null ? (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Sin bus asignado</Text>
            <Text style={styles.text}>
              No se encontró un bus asignado a este estudiante.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Bus card */}
          <View style={styles.card}>
            <Text style={styles.title}>Bus asignado</Text>
            <Text style={styles.text}>{bus.nombre ?? "—"}</Text>

            <Text style={styles.muted}>Estado: {renderStatus(bus.status)}</Text>

            {bus.child_stop && bus.status === "EN_RUTA" && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Tu hijo/a</Text>
                <Text style={styles.text}>{bus.child_stop.nombre}</Text>
                {bus.etaMinutes && (
                  <Text style={styles.muted}>
                    🚍 El bus llegará en ~{bus.etaMinutes} min
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonsRow}>
              <Pressable
                onPress={() => callDriver(bus.driver_phone)}
                style={styles.callBtn}
              >
                <Text style={styles.callTxt}>📞 Llamar</Text>
              </Pressable>

              <Pressable
                onPress={goToMap}
                style={[
                  styles.primaryBtn,
                  !canOpenMap && { opacity: 0.5 },
                ]}
                disabled={!canOpenMap}
              >
                <Text style={styles.primaryTxt}>🗺 Ver en mapa</Text>
              </Pressable>
            </View>
          </View>

          {/* Colegio card */}
          <View style={styles.card}>
            <Text style={styles.title}>Colegio</Text>
            <Text style={styles.text}>{school?.nombre ?? "—"}</Text>
            <Text style={styles.text}>{school?.direccion ?? "—"}</Text>

            <Pressable
              onPress={openDirectionsToSchool}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryTxt}>📍 Cómo llegar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB" },
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sub: { marginTop: 8, color: "#6B7896" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  title: { color: "#6B7896", fontSize: 12, fontWeight: "700" },
  label: { color: "#6B7896", marginTop: 4, fontSize: 13 },
  text: { color: "#12254A", marginTop: 4, fontWeight: "700" },
  muted: { color: "#98A0B6", marginTop: 2, fontSize: 12 },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  callBtn: { backgroundColor: "#0E9F6E", padding: 10, borderRadius: 10 },
  callTxt: { color: "white", fontWeight: "800" },
  primaryBtn: { backgroundColor: "#3557F5", padding: 10, borderRadius: 10 },
  primaryTxt: { color: "white", fontWeight: "800" },
  secondaryBtn: {
    marginTop: 10,
    backgroundColor: "#F4F6FF",
    padding: 10,
    borderRadius: 10,
  },
  secondaryTxt: { color: "#3557F5", fontWeight: "800" },
});
