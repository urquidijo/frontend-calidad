import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, View, Text, StyleSheet, Pressable } from "react-native";
import MapView, {
  Marker,
  Polyline,
  LatLng,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";

type Waypoint = {
  tipo: "DEPOSITO" | "CASA" | "COLEGIO";
  id?: number;
  nombre: string;
  lat: number;
  lon: number;
};
type EstudianteCasa = {
  id: number;
  nombre: string;
  homeLat: number;
  homeLon: number;
};

type MapLatLng = { latitude: number; longitude: number };

type LocalSimState = {
  route: MapLatLng[];
  segLens: number[];
  cum: number[];
  total: number;
  s: number;
  speed: number;
  dwellUntil: number | null;
  last: number;
  finished: boolean;
  stopTypes: Waypoint["tipo"][];
};

const ICONS = {
  bus: "\u{1F68C}",
  start: "\u{1F68F}",
  child: "\u{2B50}",
  school: "\u{1F3EB}",
  house: "\u{1F3E0}",
} as const;

const toRad = (x: number) => (x * Math.PI) / 180;
const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

const haversineLL = (a: MapLatLng, b: MapLatLng) => {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const precomputePolylineLL = (coords: MapLatLng[]) => {
  const segLens: number[] = [];
  const cum: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineLL(coords[i], coords[i + 1]);
    segLens.push(d);
    cum.push(cum[cum.length - 1] + d);
  }
  return { segLens, cum, total: cum[cum.length - 1] ?? 0 };
};

const findSegmentIndex = (cum: number[], s: number) => {
  if (cum.length <= 1) return 0;
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (s < cum[mid]) hi = mid;
    else lo = mid;
  }
  return Math.max(0, Math.min(lo, cum.length - 2));
};

const pointAtSOnRoute = (
  state: {
    route: MapLatLng[];
    segLens: number[];
    cum: number[];
    total: number;
  },
  s: number
): MapLatLng => {
  const { route, segLens, cum, total } = state;
  if (route.length < 2) return route[0] ?? { latitude: 0, longitude: 0 };
  s = clamp(s, 0, total);
  const idx = findSegmentIndex(cum, s);
  const segLen = segLens[idx] || 0;
  const A = route[idx];
  const B = route[idx + 1];
  if (segLen <= 0) return A;
  const t = clamp((s - cum[idx]) / segLen, 0, 1);
  return {
    latitude: A.latitude + (B.latitude - A.latitude) * t,
    longitude: A.longitude + (B.longitude - A.longitude) * t,
  };
};

const nearestNodeIndex = (cum: number[], s: number) => {
  let bestIdx = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < cum.length; i++) {
    const d = Math.abs(cum[i] - s);
    if (d < best) {
      best = d;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const bearingLL = (a: MapLatLng, b: MapLatLng) => {
  if (a.latitude === b.latitude && a.longitude === b.longitude) return 0;
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return ((brng * 180) / Math.PI + 360) % 360;
};

export default function MapScreen({ route }: any) {
  const { busId, childId } = route.params as {
    busId: number;
    childId?: number;
  };
  const mapRef = useRef<MapView | null>(null);

  const [hijos, setHijos] = useState<EstudianteCasa[]>([]);
  const [wps, setWps] = useState<Waypoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [busPos, setBusPos] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [localSimActive, setLocalSimActive] = useState(false);

  const simRef = useRef<LocalSimState | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initialRegion = {
    latitude: -17.7833,
    longitude: -63.1821,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  useEffect(() => {
    (async () => {
      const [r1, r2] = await Promise.all([
        api.get(`/buses/${busId}/estudiantes`),
        api.get(`/buses/${busId}/ruta-casas`),
      ]);
      setHijos(r1.data ?? []);
      setWps(r2.data?.waypoints ?? []);
      const rawPolyline = r2.data?.polyline as
        | { lat: number; lon: number }[]
        | undefined;
      if (rawPolyline?.length) {
        setRouteCoords(
          rawPolyline.map((p) => ({ latitude: p.lat, longitude: p.lon }))
        );
      } else {
        setRouteCoords([]);
      }
    })();
  }, [busId]);

  const poly: LatLng[] = useMemo(
    () =>
      routeCoords.length
        ? routeCoords
        : wps.map((w) => ({ latitude: w.lat, longitude: w.lon })),
    [routeCoords, wps]
  );

  const childHouse = useMemo(() => {
    if (!childId) return null;
    const h = hijos.find((x) => x.id === childId);
    return h
      ? { latitude: h.homeLat, longitude: h.homeLon, nombre: h.nombre }
      : null;
  }, [childId, hijos]);

  const school = useMemo(() => {
    const last = wps[wps.length - 1];
    return last?.tipo === "COLEGIO"
      ? { latitude: last.lat, longitude: last.lon }
      : null;
  }, [wps]);

  const depot = useMemo(() => {
    const first = wps.find((w) => w.tipo === "DEPOSITO");
    return first
      ? { latitude: first.lat, longitude: first.lon, nombre: first.nombre }
      : null;
  }, [wps]);

  const fitAll = () => {
    const coords: LatLng[] = [];
    coords.push(...poly);
    if (busPos) coords.push(busPos);
    if (childHouse) coords.push(childHouse);
    if (depot) coords.push(depot);
    hijos.forEach((h) =>
      coords.push({ latitude: h.homeLat, longitude: h.homeLon })
    );
    if (coords.length && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  };

  const fetchLocation = useCallback(async () => {
    if (!busId || localSimActive) return;
    try {
      const { data } = await api.get(`/buses/${busId}/location`);
      if (localSimActive) return;
      if (data?.lat != null && data?.lon != null) {
        const next = { latitude: data.lat, longitude: data.lon };
        setHeading(data.heading ?? 0);
        setBusPos((prev) => (prev ? lerpLatLng(prev, next, 0.35) : next));
      }
    } catch (error) {
      // Silenciamos errores para no saturar la UI cuando el backend no está disponible
      console.debug("[map] polling error", error);
    }
  }, [busId, localSimActive]);

  // Polling de ubicación (desactivado cuando corre la simulación local)
  useEffect(() => {
    fetchLocation();
    if (!busId || localSimActive) return;
    const t = setInterval(fetchLocation, 1000);
    return () => clearInterval(t);
  }, [busId, localSimActive, fetchLocation]);

  const clearLocalSim = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    simRef.current = null;
    setLocalSimActive(false);
    setSimulating(false);
  }, []);

  useEffect(() => () => clearLocalSim(), [clearLocalSim]);

  const runLocalSimTick = useCallback(() => {
    const state = simRef.current;
    if (!state || state.finished) return;
    const now = Date.now();
    const dt = Math.max(0.016, (now - state.last) / 1000);
    state.last = now;

    if (state.dwellUntil && now < state.dwellUntil) return;
    if (state.dwellUntil && now >= state.dwellUntil) state.dwellUntil = null;

    state.s = Math.min(state.total, state.s + state.speed * dt);

    const pos = pointAtSOnRoute(state, state.s);
    setBusPos(pos);
    const look = pointAtSOnRoute(state, Math.min(state.total, state.s + 12));
    setHeading(bearingLL(pos, look));

    const idx = nearestNodeIndex(state.cum, state.s);
    const isHouse =
      idx > 0 &&
      idx < state.route.length - 1 &&
      state.stopTypes[idx] === "CASA";
    if (
      isHouse &&
      !state.dwellUntil &&
      Math.abs(state.cum[idx] - state.s) < 6
    ) {
      state.dwellUntil = now + 2000; // pausa breve para simular subida/bajada
    }

    if (state.s >= state.total) {
      state.finished = true;
      clearLocalSim();
    }
  }, [clearLocalSim]);

  const startLocalSim = useCallback(() => {
    if (poly.length < 2) {
      Alert.alert(
        "Ruta insuficiente",
        "Necesitamos al menos dos puntos para simular el recorrido."
      );
      return false;
    }
    const { segLens, cum, total } = precomputePolylineLL(poly);
    const now = Date.now();
    simRef.current = {
      route: poly,
      segLens,
      cum,
      total,
      s: 0,
      speed: 36,
      dwellUntil: null,
      last: now,
      finished: false,
      stopTypes: wps.map((w) => w.tipo),
    };
    setLocalSimActive(true);
    setSimulating(true);
    setBusPos(poly[0]);
    if (poly.length > 1) {
      setHeading(bearingLL(poly[0], poly[1]));
    }
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    simTimerRef.current = setInterval(runLocalSimTick, 120);
    return true;
  }, [poly, runLocalSimTick, wps]);

  const startSim = useCallback(async () => {
    if (simulating) return;
    const started = startLocalSim();
    if (!started) return;
    try {
      await api.post(`/buses/${busId}/sim/start`, {
        minSpeed: 12,
        maxSpeed: 30,
        accel: 1.6,
        decel: 2.2,
        brakeDist: 70,
        dwellCasa: 2,
        dwellColegio: 30,
        tickMs: 60,
      });
    } catch (error) {
      console.debug("[map] startSim fallback", error);
    }
  }, [busId, simulating, startLocalSim]);

  const stopSim = useCallback(async () => {
    clearLocalSim();
    try {
      await api.post(`/buses/${busId}/sim/stop`);
    } catch (error) {
      console.debug("[map] stopSim fallback", error);
    }
  }, [busId, clearLocalSim]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.banner}>
        <Text
          style={styles.bannerTxt}
          accessibilityLabel="map-banner"
          testID="map-banner"
        >
          Monitoreo de bus (simulado)
        </Text>
      </View>

      <View style={styles.legend}>
        <Legend label="Bus" emoji={ICONS.bus} />
        <Legend label="Inicio de ruta" emoji={ICONS.start} />
        <Legend label="Casa de tu hijo" emoji={ICONS.child} />
        <Legend label="Colegio" emoji={ICONS.school} />
        <Legend label="Casa (otros)" emoji={ICONS.house} />
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
      >
        {poly.length > 1 && (
          <Polyline
            coordinates={poly}
            strokeWidth={5}
            strokeColor="#3557F5"
            lineCap="round"
          />
        )}

        {depot && (
          <Marker
            coordinate={depot}
            title={depot.nombre ?? "Inicio de ruta"}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.depot}>
              <Text style={{ fontSize: 16 }}>{ICONS.start}</Text>
            </View>
          </Marker>
        )}
        {childHouse && (
          <Marker
            coordinate={childHouse}
            title={`${ICONS.child} Casa de tu hijo`}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.childMarker}>
              <Text style={{ fontSize: 18 }}>{ICONS.child}</Text>
            </View>
          </Marker>
        )}

        {hijos
          .filter((h) => h.id !== childId)
          .map((h) => (
            <Marker
              key={h.id}
              coordinate={{ latitude: h.homeLat, longitude: h.homeLon }}
              title={h.nombre}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.otherHouse}>
                <Text>{ICONS.house}</Text>
              </View>
            </Marker>
          ))}

        {school && (
          <Marker
            coordinate={school}
            title="Colegio"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.school}>
              <Text>{ICONS.school}</Text>
            </View>
          </Marker>
        )}

        {busPos && (
          <Marker
            coordinate={busPos}
            title="Bus"
            flat
            rotation={heading}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.bus}>
              <Text style={{ fontSize: 20 }}>{ICONS.bus}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={fitAll}>
          <Text style={styles.btnTxt}>Centrar</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, simulating && styles.btnDisabled]}
          onPress={startSim}
          disabled={simulating}
        >
          <Text style={styles.btnTxt}>
            {simulating ? "Simulando" : "Iniciar"}
          </Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={stopSim}>
          <Text style={styles.btnTxt}>Detener</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ===== helpers ===== */
function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

function Legend({ label, emoji }: { label: string; emoji: string }) {
  return (
    <View style={styles.legendRow}>
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB" },
  map: { ...StyleSheet.absoluteFillObject },
  banner: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 99,
    elevation: 3,
  },
  bannerTxt: { fontWeight: "700", color: "#12254A" },

  legend: {
    position: "absolute",
    top: 64,
    left: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    zIndex: 99,
    elevation: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 2,
  },
  legendTxt: { fontSize: 12, color: "#12254A", fontWeight: "600" },

  controls: { position: "absolute", right: 12, bottom: 24, gap: 8 },
  btn: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  btnTxt: { color: "#12254A", fontWeight: "800" },
  btnDisabled: { opacity: 0.55 },

  bus: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#E5EAF3",
  },
  depot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  childMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF7D1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F3D25B",
  },
  school: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E6FFF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38B2AC",
  },
  otherHouse: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFE4E4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E53935",
  },
});
