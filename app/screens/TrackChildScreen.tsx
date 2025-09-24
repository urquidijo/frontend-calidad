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
  route_name?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  status?: string | null;
  last_location?: { lat: number; lng: number; timestamp?: string } | null;
  colegioId?: number | null;
  route_coords?: { lat: number; lng: number }[] | null;
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
      const { data } = await api.get(`/students/${childId}/bus`);
      let fetchedBus: any = null;
      if (data?.bus) fetchedBus = data.bus;
      else if (Array.isArray(data?.items) && data.items.length > 0)
        fetchedBus = data.items[0];
      else if (data?.item) fetchedBus = data.item;
      else if (data) fetchedBus = data;

      if (!fetchedBus) {
        setBus(null);
        setSchool(null);
        return;
      }

      const normalized: BusResp = {
        id: Number(fetchedBus.id),
        codigo: fetchedBus.codigo ?? fetchedBus.code ?? fetchedBus.id,
        nombre:
          fetchedBus.nombre ?? fetchedBus.route_name ?? fetchedBus.routeName,
        placa: fetchedBus.placa ?? fetchedBus.plate,
        route_name: fetchedBus.route_name ?? fetchedBus.routeName ?? null,
        driver_name:
          fetchedBus.driver_name ??
          fetchedBus.conductor ??
          fetchedBus.driverName ??
          null,
        driver_phone:
          fetchedBus.driver_phone ??
          fetchedBus.driverPhone ??
          fetchedBus.conductorPhone ??
          null,
        status: fetchedBus.status ?? null,
        last_location:
          fetchedBus.last_location ??
          (fetchedBus.location
            ? {
                lat: fetchedBus.location.lat,
                lng: fetchedBus.location.lng,
                timestamp: fetchedBus.location.timestamp,
              }
            : null) ??
          null,
        colegioId: fetchedBus.colegioId ?? fetchedBus.schoolId ?? null,
        route_coords: Array.isArray(fetchedBus.route_coords)
          ? fetchedBus.route_coords.map((p: any) => ({
              lat: Number(p.lat ?? p.latitude),
              lng: Number(p.lng ?? p.longitude),
            }))
          : Array.isArray(fetchedBus.route)
          ? fetchedBus.route.map((p: any) => ({
              lat: Number(p.lat ?? p.latitude),
              lng: Number(p.lng ?? p.longitude),
            }))
          : null,
      };

      setBus(normalized);

      const schoolId = normalized.colegioId;
      if (schoolId) {
        try {
          const { data: schoolData } = await api.get(`/schools/${schoolId}`);
          const s =
            schoolData?.school ??
            (Array.isArray(schoolData?.items)
              ? schoolData.items[0]
              : schoolData?.item ?? schoolData);
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
        } catch (e) {
          console.warn("No se pudo obtener info del colegio", e);
          setSchool(null);
        }
      } else {
        setSchool(null);
      }
    } catch (err: any) {
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
    const link = `tel:${phone}`;
    Linking.canOpenURL(link)
      .then((supported) => {
        if (supported) Linking.openURL(link);
        else
          Alert.alert(
            "No se puede llamar",
            "Tu dispositivo no permite realizar llamadas desde la app."
          );
      })
      .catch(() => Alert.alert("Error", "No se pudo iniciar la llamada."));
  };

  const goToMap = () => {
    if (!bus) return;
    const routeCoordinates =
      bus.route_coords?.map((p) => ({ latitude: p.lat, longitude: p.lng })) ??
      undefined;
    const busPosition = bus.last_location
      ? { latitude: bus.last_location.lat, longitude: bus.last_location.lng }
      : undefined;
    nav.navigate("Map" as any, { routeCoordinates, busPosition } as any);
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
              No se encontró un bus asignado a este estudiante. Pide al colegio
              que asigne un bus al alumno para poder monitorearlo.
            </Text>

            <Pressable
              onPress={() => {
                Alert.alert(
                  "Contacto colegio",
                  "Si deseas, puedes contactar al colegio para solicitar la asignación del bus."
                );
              }}
              style={({ pressed }) => [
                styles.cta,
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={styles.ctaTxt}>Contactar al colegio</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Bus card */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Bus asignado</Text>
                <View style={styles.row}>
                  <View style={[styles.pill, { backgroundColor: "#E8F0FF" }]}>
                    <Text style={styles.pillTxt}>{bus.codigo ?? "—"}</Text>
                  </View>
                  <Text style={[styles.status, { marginLeft: 8 }]}>
                    {bus.status
                      ? bus.status.replace(/_/g, " ")
                      : "Estado desconocido"}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                <Text style={styles.smallLabel}>Ruta</Text>
                <Text style={[styles.text, { fontSize: 14 }]} numberOfLines={1}>
                  {bus.nombre ?? bus.route_name ?? "—"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={{ gap: 8 }}>
              <View style={styles.infoRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.label}>Placa</Text>
                  <Text style={styles.text}>{bus.placa ?? "—"}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Última ubicación</Text>
                  <Text style={styles.text}>
                    {bus.last_location
                      ? `${bus.last_location.lat.toFixed(
                          6
                        )}, ${bus.last_location.lng.toFixed(6)}`
                      : "No disponible"}
                  </Text>
                  {bus.last_location?.timestamp ? (
                    <Text style={styles.muted}>
                      Actualizado:{" "}
                      {new Date(bus.last_location.timestamp).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.dividerSmall} />

              {/* Conductor */}
              <Text style={styles.label}>Conductor</Text>
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.text}>{bus.driver_name ?? "—"}</Text>
                <Text style={styles.muted}>{bus.driver_phone ?? "—"}</Text>
              </View>

              <View style={styles.buttonsRow}>
                <Pressable
                  onPress={() => callDriver(bus.driver_phone)}
                  style={({ pressed }) => [
                    styles.callBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.callTxt}>📞 Llamar</Text>
                </Pressable>

                <Pressable
                  onPress={goToMap}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text style={styles.primaryTxt}>🗺 Ver en mapa</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Colegio card (dirección abajo y multilinea) */}
          <View style={[styles.card, { paddingVertical: 12 }]}>
            <Text style={styles.title}>Colegio</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Nombre</Text>
            <Text style={[styles.text, { fontSize: 15 }]} numberOfLines={2}>
              {school?.nombre ?? "—"}
            </Text>

            {/* Dirección en su propia línea, permite wrap y varias líneas */}
            <Text style={[styles.label, { marginTop: 10 }]}>Dirección</Text>
            <Text style={styles.textMultiline}>{school?.direccion ?? "—"}</Text>

            {/* Botones por debajo de la dirección */}
            <View style={[styles.cardButtonsRow]}>

              <Pressable
                onPress={openDirectionsToSchool}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.95 },
                ]}
              >
                <Text style={styles.secondaryTxt}>📍 Cómo llegar</Text>
              </Pressable>
            </View>
          </View>

          {/* Small helper note */}
          <View style={[styles.infoNoteWrap]}>
            <Text style={styles.infoNote}>
              Pulsa "Ver en mapa" para ver la ruta y la posición del bus en
              tiempo real (si está disponible).
            </Text>
          </View>

        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB", paddingTop: 0 },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  centered: { padding: 24, alignItems: "center" },
  sub: { marginTop: 8, color: "#6B7896" },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },

  title: { color: "#6B7896", fontSize: 12, fontWeight: "700" },
  smallLabel: { color: "#98A0B6", fontSize: 12 },
  label: { color: "#6B7896", marginTop: 2, fontSize: 13 },
  text: { color: "#12254A", marginTop: 4, fontWeight: "700" },
  muted: { color: "#98A0B6", marginTop: 4, fontSize: 12 },

  // dirección multilinea (no se sale)
  textMultiline: {
    color: "#12254A",
    marginTop: 6,
    fontWeight: "600",
    fontSize: 13,
    flexWrap: "wrap",
  },

  row: { flexDirection: "row", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  pillTxt: { fontWeight: "800", color: "#12254A" },
  status: { fontWeight: "700", color: "#6B7896" },

  // botones del conductor (debajo)
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  callBtn: {
    backgroundColor: "#0E9F6E",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
    marginRight: 6,
  },
  callTxt: { color: "white", fontWeight: "800" },

  primaryBtn: {
    backgroundColor: "#3557F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  primaryTxt: { color: "white", fontWeight: "800" },

  // botones de la tarjeta colegio — debajo de la dirección
  cardButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },

  secondaryBtn: {
    backgroundColor: "#F4F6FF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTxt: { color: "#3557F5", fontWeight: "800" },

  ghostBtn: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  ghostTxt: { color: "#6B7896", fontWeight: "700" },

  cta: {
    marginTop: 12,
    backgroundColor: "#3557F5",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaTxt: { color: "white", fontWeight: "800" },

  divider: { height: 1, backgroundColor: "#F1F4FB", marginVertical: 12 },
  dividerSmall: { height: 1, backgroundColor: "#F7F9FE", marginVertical: 10 },

  infoRow: { flexDirection: "row", justifyContent: "space-between" },

  infoNoteWrap: {
    marginTop: 6,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F7FAFF",
  },
  infoNote: { color: "#6B7896", fontSize: 13 },

  // floating button styles
  floatingWrap: { alignItems: "center", marginTop: 8 },
  floatingBtn: {
    backgroundColor: "#12254A",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 2,
  },
  floatingTxt: { color: "white", fontWeight: "900" },
});
