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
  ScrollView,
  RefreshControl,
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
  last_location?: { lat: number; lng: number; timestamp?: string } | null;
  colegioId?: number | null;
  route_coords?: { id: number; nombre: string; lat: number; lng: number }[] | null;
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
  const childId = Number((route.params as { childId: string | number })?.childId);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bus, setBus] = useState<BusResp | null>(null);
  const [school, setSchool] = useState<SchoolResp | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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
        last_location: fetchedBus.last_location
          ? {
              lat: Number(fetchedBus.last_location.lat),
              lng: Number(fetchedBus.last_location.lng ?? fetchedBus.last_location.lon),
              timestamp: fetchedBus.last_location.timestamp,
            }
          : null,
        colegioId: fetchedBus.colegioId ?? fetchedBus.schoolId ?? fetchedBus.colegio?.id ?? null,
        route_coords: Array.isArray(fetchedBus.route_coords)
          ? fetchedBus.route_coords.map((p: any) => ({
              id: Number(p.id),
              nombre: p.nombre ?? p.name,
              lat: Number(p.lat),
              lng: Number(p.lng ?? p.lon),
            }))
          : null,
        child_stop: fetchedBus.child_stop ?? null,
        etaMinutes: fetchedBus.etaMinutes ?? null,
      };

      setBus(normalized);

      if (normalized.colegioId) {
        const { data: schoolData } = await api.get(`/schools/${normalized.colegioId}`);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const callDriver = (phone?: string | null) => {
    if (!phone) {
      Alert.alert("Teléfono no disponible", "El número del conductor no está registrado.");
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Error", "No se pudo iniciar la llamada.")
    );
  };

  const goToMap = () => {
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
      Alert.alert("Sin datos de mapa", "No hay ubicación del bus ni coordenadas del colegio o la ruta.");
      return;
    }

    nav.navigate("Map" as any, {
      routeCoordinates,
      busPosition,
      schoolPosition,
      busId: bus?.id ?? null,
      childId,
    } as any);
  };

  const openDirectionsToSchool = () => {
    if (!school?.lat || !school?.lon) {
      Alert.alert("Ubicación no disponible", "Las coordenadas del colegio no están registradas.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${school.lat},${school.lon}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir la aplicación de mapas.")
    );
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
            <Text style={styles.text}>No se encontró un bus asignado a este estudiante.</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Banner siempre EN RUTA */}
          <View style={styles.banner}>
            <Text style={styles.bannerTxt}>🟢 En ruta hacia el colegio</Text>
            {bus?.etaMinutes ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>ETA ~{bus.etaMinutes} min</Text>
              </View>
            ) : null}
          </View>

          {/* Bus card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Bus asignado</Text>
              {bus.codigo ? <Text style={styles.codeChip}>#{bus.codigo}</Text> : null}
            </View>

            <Text style={styles.name}>{bus.nombre ?? "—"}</Text>

            <View style={styles.infoRow}>
              {bus.placa ? <InfoPill label="Placa" value={bus.placa} /> : null}
              {bus.driver_name ? <InfoPill label="Conductor" value={bus.driver_name} /> : null}
            </View>

            {bus.child_stop ? (
              <View style={styles.section}>
                <Text style={styles.label}>Parada de tu hijo/a</Text>
                <Text style={styles.value}>{bus.child_stop.nombre}</Text>
              </View>
            ) : null}

            <View style={styles.buttonsRow}>
              <Pressable onPress={() => callDriver(bus.driver_phone)} style={styles.callBtn}>
                <Text style={styles.callTxt}>📞 Llamar</Text>
              </Pressable>

              <Pressable
                onPress={goToMap}
                style={[styles.primaryBtn, !canOpenMap && { opacity: 0.5 }]}
                disabled={!canOpenMap}
              >
                <Text style={styles.primaryTxt}>🗺 Ver en mapa</Text>
              </Pressable>
            </View>
          </View>

          {/* Colegio card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Colegio</Text>
            <Text style={styles.name}>{school?.nombre ?? "—"}</Text>
            <Text style={styles.muted}>{school?.direccion ?? "—"}</Text>

            <Pressable onPress={openDirectionsToSchool} style={styles.secondaryBtn}>
              <Text style={styles.secondaryTxt}>📍 Cómo llegar</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ===== UI Pieces ===== */
function InfoPill({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  title: { color: "#6B7896", fontSize: 12, fontWeight: "700" },
  text: { color: "#12254A", marginTop: 4, fontWeight: "700" },
  safe: { flex: 1, backgroundColor: "#F5F7FB" },

  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sub: { marginTop: 8, color: "#6B7896" },

  // Banner superior, siempre "En ruta"
  banner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E8ECF5",
  },
  bannerTxt: { fontWeight: "800", color: "#0E9F6E" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EAF2FF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E2FF",
  },
  badgeTxt: { fontSize: 12, fontWeight: "800", color: "#3557F5" },

  // Tarjetas
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E8ECF5",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: "#6B7896", fontSize: 12, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  codeChip: {
    backgroundColor: "#F4F6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDE3FF",
    fontSize: 12,
    color: "#3557F5",
    overflow: "hidden",
  },

  name: { color: "#12254A", marginTop: 6, fontWeight: "800", fontSize: 16 },
  muted: { color: "#98A0B6", marginTop: 4, fontSize: 12 },

  section: { marginTop: 12 },
  label: { color: "#6B7896", fontSize: 12 },
  value: { color: "#12254A", marginTop: 2, fontWeight: "700" },

  infoRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F7F9FD",
    borderWidth: 1,
    borderColor: "#E7ECF7",
  },
  pillLabel: { color: "#6B7896", fontSize: 12 },
  pillValue: { color: "#12254A", fontSize: 12, fontWeight: "800" },

  // Botones
  buttonsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, gap: 10 },
  callBtn: { flex: 1, backgroundColor: "#0E9F6E", padding: 12, borderRadius: 12, alignItems: "center" },
  callTxt: { color: "white", fontWeight: "800" },
  primaryBtn: { flex: 1, backgroundColor: "#3557F5", padding: 12, borderRadius: 12, alignItems: "center" },
  primaryTxt: { color: "white", fontWeight: "800" },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: "#F4F6FF",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E6FF",
  },
  secondaryTxt: { color: "#3557F5", fontWeight: "800" },
});
