// screens/SelectSchoolScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../src/lib/api";

type School = { id: string; nombre: string; direccion?: string };

export default function SelectSchoolScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/schools");
      setSchools(data.items ?? []);
    } catch (err) {
      console.warn("Error fetching schools", err);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchSchools();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchSchools]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSchools();
    } finally {
      setRefreshing(false);
    }
  }, [fetchSchools]);

  // Filter: busca por nombre o direccion (sin ciudad)
  const filtered = useMemo(() => {
    if (!debouncedQ) return schools;
    return schools.filter((s) => {
      const name = (s.nombre ?? "").toLowerCase();
      const dir = (s.direccion ?? "").toLowerCase();
      return name.includes(debouncedQ) || dir.includes(debouncedQ);
    });
  }, [schools, debouncedQ]);

  // simple avatar color by id
  const avatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h} 74% 92%)`;
  };

  // Genera iniciales evitando la primera palabra (p. ej. "Colegio")
  const initialsFromName = (name: string) => {
    if (!name) return "??";
    const words = name.trim().split(/\s+/);
    const relevant = words.length > 1 ? words.slice(1) : words;
    if (relevant.length === 0) return name.slice(0, 2).toUpperCase();
    if (relevant.length >= 2) {
      const a = relevant[0].charAt(0) || "";
      const b = relevant[1].charAt(0) || "";
      return (a + b).toUpperCase();
    }
    const single = relevant[0];
    if (single.length >= 2) return single.slice(0, 2).toUpperCase();
    return single.charAt(0).toUpperCase();
  };

  // Highlight helper: devuelve React elements con match resaltado
  const highlightText = (text: string | undefined) => {
    const safe = text ?? "";
    if (!debouncedQ) return <Text style={styles.meta}>{safe}</Text>;
    const idx = safe.toLowerCase().indexOf(debouncedQ);
    if (idx === -1) return <Text style={styles.meta}>{safe}</Text>;
    const before = safe.slice(0, idx);
    const match = safe.slice(idx, idx + debouncedQ.length);
    const after = safe.slice(idx + debouncedQ.length);
    return (
      <Text style={styles.meta}>
        {before}
        <Text style={styles.highlight}>{match}</Text>
        {after}
      </Text>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F5F7FB" }}
      edges={["top", "left", "right"]}
    >
      <View style={styles.container}>
        <View style={styles.searchWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar colegio por nombre o dirección"
            placeholderTextColor="#9AA6BF"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
            accessibilityLabel="Buscar colegios por nombre o dirección"
          />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingTxt}>Cargando colegios…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>
                  No se encontraron colegios
                </Text>
                <Text style={styles.emptySub}>
                  Intenta con otra búsqueda o pulsa recargar.
                </Text>
                <Pressable style={styles.reloadBtn} onPress={fetchSchools}>
                  <Text style={styles.reloadTxt}>Recargar colegios</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  nav.navigate("VerifyStudent", {
                    schoolId: item.id,
                    schoolName: item.nombre,
                  })
                }
                style={({ pressed }) => [
                  styles.item,
                  pressed && { opacity: 0.95 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar colegio ${item.nombre}`}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: avatarColor(item.id) },
                  ]}
                >
                  <Text style={styles.avatarTxt}>
                    {initialsFromName(item.nombre)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {/* highlight name too */}
                    {highlightText(item.nombre)}
                  </Text>
                  {/* Dirección en su propia línea, multilinea */}
                  <View style={{ marginTop: 6 }}>
                    {highlightText(item.direccion ?? "")}
                  </View>
                </View>

                <Text style={styles.chev}>›</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#D8E0EF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "white",
    fontSize: 15,
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { marginTop: 8, color: "#6B7896" },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarTxt: { fontWeight: "900", color: "#12254A", fontSize: 16 },

  // Name: keep bold; highlight handled by highlightText
  name: { fontWeight: "800", color: "#12254A", fontSize: 16 },

  // direccion / meta text
  meta: { color: "#6B7896", fontSize: 13, flexShrink: 1 },
  highlight: {
    backgroundColor: "#FFF1A8",
    color: "#12254A",
    fontWeight: "700",
  },

  chev: { color: "#A0ABC0", fontSize: 28, marginLeft: 8, marginRight: 4 },

  emptyWrap: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#12254A" },
  emptySub: { color: "#6B7896", marginTop: 6, textAlign: "center" },
  reloadBtn: {
    marginTop: 12,
    backgroundColor: "#3557F5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  reloadTxt: { color: "white", fontWeight: "800" },
});
