import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MapView, { Marker, Polyline, LatLng, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';

type Waypoint = { tipo: 'CASA'|'COLEGIO'; id?: number; nombre: string; lat: number; lon: number };
type EstudianteCasa = { id: number; nombre: string; homeLat: number; homeLon: number };

export default function MapScreen({
  route,
}: any) {
  const { busId, childId } = route.params as { busId: number; childId?: number };
  const mapRef = useRef<MapView | null>(null);

  const [hijos, setHijos] = useState<EstudianteCasa[]>([]);
  const [wps, setWps] = useState<Waypoint[]>([]);
  const [busPos, setBusPos] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState(0);

  const initialRegion = {
    latitude: -17.7833, longitude: -63.1821, latitudeDelta: 0.12, longitudeDelta: 0.12,
  };

  useEffect(() => {
    (async () => {
      const [r1, r2] = await Promise.all([
        api.get(`/buses/${busId}/estudiantes`),
        api.get(`/buses/${busId}/ruta-casas`),
      ]);
      setHijos(r1.data ?? []);
      setWps(r2.data?.waypoints ?? []);
    })();
  }, [busId]);

  const poly: LatLng[] = useMemo(
    () => wps.map(w => ({ latitude: w.lat, longitude: w.lon })),
    [wps]
  );

  const childHouse = useMemo(() => {
    if (!childId) return null;
    const h = hijos.find(x => x.id === childId);
    return h ? { latitude: h.homeLat, longitude: h.homeLon, nombre: h.nombre } : null;
  }, [childId, hijos]);

  const school = useMemo(() => {
    const last = wps[wps.length - 1];
    return last?.tipo === 'COLEGIO' ? { latitude: last.lat, longitude: last.lon } : null;
  }, [wps]);

  const fitAll = () => {
    const coords: LatLng[] = [];
    coords.push(...poly);
    if (busPos) coords.push(busPos);
    if (childHouse) coords.push(childHouse);
    hijos.forEach(h => coords.push({ latitude: h.homeLat, longitude: h.homeLon }));
    if (coords.length && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  };

  // Polling de ubicación
  useEffect(() => {
    if (!busId) return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/buses/${busId}/location`);
        if (data?.lat != null && data?.lon != null) {
          const next = { latitude: data.lat, longitude: data.lon };
          setHeading(data.heading ?? 0);
          setBusPos(prev => prev ? lerpLatLng(prev, next, 0.35) : next);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(t);
  }, [busId]);

  const startSim = async () => {
    await api.post(`/buses/${busId}/sim/start`, {
      minSpeed: 6, maxSpeed: 15, accel: 1.6, decel: 2.2, brakeDist: 70,
      dwellCasa: 10, dwellColegio: 30, tickMs: 60,
    });
  };
  const stopSim = async () => {
    await api.post(`/buses/${busId}/sim/stop`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top','left','right']}>
      <View style={styles.banner}><Text style={styles.bannerTxt}>Monitoreo de bus (simulado)</Text></View>

      <View style={styles.legend}>
        <Legend label="Bus" emoji="🚌" />
        <Legend label="Casa de tu hijo" emoji="⭐" />
        <Legend label="Colegio" emoji="🏫" />
        <Legend label="Casa (otros)" emoji="🏠" />
      </View>

      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={initialRegion}>
        {poly.length > 1 && (
          <Polyline coordinates={poly} strokeWidth={5} strokeColor="#3557F5" lineCap="round" />
        )}

        {childHouse && (
          <Marker coordinate={childHouse} title="⭐ Casa de tu hijo" anchor={{x:0.5,y:0.5}}>
            <View style={styles.childMarker}><Text style={{fontSize:18}}>⭐</Text></View>
          </Marker>
        )}

        {hijos.filter(h => h.id !== childId).map(h => (
          <Marker key={h.id} coordinate={{ latitude: h.homeLat, longitude: h.homeLon }} title={h.nombre} anchor={{x:0.5,y:0.5}}>
            <View style={styles.otherHouse}><Text>🏠</Text></View>
          </Marker>
        ))}

        {school && (
          <Marker coordinate={school} title="Colegio" anchor={{x:0.5,y:0.5}}>
            <View style={styles.school}><Text>🏫</Text></View>
          </Marker>
        )}

        {busPos && (
          <Marker coordinate={busPos} title="Bus" flat rotation={heading} anchor={{x:0.5,y:0.5}}>
            <View style={styles.bus}><Text style={{fontSize:20}}>🚌</Text></View>
          </Marker>
        )}
      </MapView>

      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={fitAll}><Text style={styles.btnTxt}>Centrar</Text></Pressable>
        <Pressable style={styles.btn} onPress={startSim}><Text style={styles.btnTxt}>Iniciar</Text></Pressable>
        <Pressable style={styles.btn} onPress={stopSim}><Text style={styles.btnTxt}>Detener</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ===== helpers ===== */
function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return { latitude: a.latitude + (b.latitude - a.latitude)*t, longitude: a.longitude + (b.longitude - a.longitude)*t };
}

function Legend({ label, emoji }: {label: string; emoji: string}) {
  return (
    <View style={styles.legendRow}>
      <Text style={{fontSize:14}}>{emoji}</Text>
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FB' },
  map: { ...StyleSheet.absoluteFillObject },
  banner: { position:'absolute', top:16, alignSelf:'center', backgroundColor:'#fff', paddingHorizontal:16, paddingVertical:8, borderRadius:12, zIndex:99, elevation:3 },
  bannerTxt: { fontWeight:'700', color:'#12254A' },

  legend: { position:'absolute', top:64, left:12, backgroundColor:'#fff', borderRadius:12, padding:8, zIndex:99, elevation:2 },
  legendRow: { flexDirection:'row', alignItems:'center', gap:6, marginVertical:2 },
  legendTxt: { fontSize:12, color:'#12254A', fontWeight:'600' },

  controls: { position:'absolute', right:12, bottom:24, gap:8 },
  btn: { backgroundColor:'#fff', paddingHorizontal:12, paddingVertical:10, borderRadius:10, elevation:3 },
  btnTxt: { color:'#12254A', fontWeight:'800' },

  bus: { width:40, height:40, borderRadius:10, alignItems:'center', justifyContent:'center', backgroundColor:'#fff', borderWidth:0.5, borderColor:'#E5EAF3' },
  childMarker: { width:32, height:32, borderRadius:16, backgroundColor:'#FFF7D1', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#F3D25B' },
  school: { width:36, height:36, borderRadius:18, backgroundColor:'#E6FFF4', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#38B2AC' },
  otherHouse: { width:26, height:26, borderRadius:13, backgroundColor:'#FFE4E4', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#E53935' },
});
