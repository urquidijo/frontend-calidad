// screens/HomeScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../src/lib/api";
import { useAuth } from "@/src/store/auth";

type Child = { id: string; nombre: string; colegio: string; grado?: string };

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hijos, setHijos] = useState<Child[]>([]);

  const fetchChildren = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/parent/children");
      setHijos(data.items ?? []);
    } catch (err) {
      console.warn("Error fetching children:", err);
      setHijos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!alive) return;
        await fetchChildren();
      })();
      return () => {
        alive = false;
      };
    }, [fetchChildren])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchChildren();
    } finally {
      setRefreshing(false);
    }
  }, [fetchChildren]);

  // Genera color suave a partir del id (para avatar)
  const avatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h} 70% 92%)`;
  };

  const childInitial = (nombre?: string) =>
    nombre ? nombre.charAt(0).toUpperCase() : "A";

  const hasChildren = hijos.length > 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F5F7FB" }}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.topBar}>
        <View style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarTxt}>
              {user?.nombre?.charAt(0).toUpperCase() ?? "👤"}
            </Text>
          </View>
          <View>
            <Text style={styles.welcome}>Hola,</Text>
            <Text style={styles.username}>{user?.nombre ?? "Usuario"}</Text>
          </View>
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.logoutTxt}>Cerrar sesión</Text>
        </Pressable>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Tus hijos</Text>
            <Text style={styles.subtitle}>
              Monitorea la llegada y ruta en tiempo real
            </Text>
          </View>

          {/* SHOW header small button only if there are hijos (kept small) */}
          {hasChildren ? (
            <Pressable
              onPress={() => nav.navigate("SelectSchool")}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.addTxt}>+ Registrar</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingTxt}>Cargando información…</Text>
          </View>
        ) : hijos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Aún no tienes estudiantes vinculados
            </Text>
            <Text style={styles.emptySub}>
              Registra a tu hijo desde un colegio afiliado para comenzar a
              monitorear sus rutas y llegada.
            </Text>
            <Pressable
              onPress={() => nav.navigate("SelectSchool")}
              style={({ pressed }) => [
                styles.cta,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.ctaTxt}>Buscar colegio afiliado</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={hijos}
            keyExtractor={(it) => it.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{
              padding: 16,
              paddingBottom: hasChildren ? 110 : 30,
            }} // dejar espacio para FAB cuando hay hijos
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => nav.navigate("TrackChild", { childId: item.id })}
                style={({ pressed }) => [
                  styles.childCard,
                  pressed && { opacity: 0.97 },
                ]}
              >
                <View
                  style={[
                    styles.childAvatar,
                    { backgroundColor: avatarColor(item.id) },
                  ]}
                >
                  <Text style={styles.childAvatarTxt}>
                    {childInitial(item.nombre)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{item.nombre}</Text>
                  <Text style={styles.childMeta} numberOfLines={1}>
                    {item.colegio}
                    {item.grado ? ` · ${item.grado}` : ""}
                  </Text>
                </View>

                <View style={styles.rowRight}>
                  <Text style={styles.chev}>›</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      {/* Floating action button: visible solo si hay hijos */}
      {hasChildren && (
        <Pressable
          onPress={() => nav.navigate("SelectSchool")}
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityLabel="Registrar un nuevo estudiante"
          accessible
        >
          <Text style={styles.fabTxt}>+ Registrar</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E5EAF3",
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E7EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontWeight: "800", color: "#12254A", fontSize: 18 },
  welcome: { fontSize: 12, color: "#6B7896" },
  username: { fontSize: 16, fontWeight: "800", color: "#12254A" },

  logoutBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FEF2F2",
  },
  logoutTxt: { color: "#DC2626", fontWeight: "700", fontSize: 12 },

  body: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#12254A" },
  subtitle: { fontSize: 12, color: "#6B7896", marginTop: 4 },

  // small header add button (kept for quick access on wide screens)
  addBtn: {
    borderWidth: 1,
    borderColor: "#D8E0EF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  addTxt: { color: "#12254A", fontWeight: "700", fontSize: 13 },

  loadingWrap: { padding: 32, alignItems: "center" },
  loadingTxt: { marginTop: 8, color: "#6B7896" },

  emptyCard: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 16,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#12254A" },
  emptySub: { color: "#6B7896", marginTop: 4 },
  cta: {
    backgroundColor: "#3557F5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  ctaTxt: { color: "white", fontWeight: "800" },

  childCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  childAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  childAvatarTxt: { fontWeight: "900", color: "#12254A", fontSize: 20 },
  childName: { fontSize: 16, fontWeight: "800", color: "#12254A" },
  childMeta: { color: "#6B7896", marginTop: 4, fontSize: 13 },

  chev: { color: "#A0ABC0", fontSize: 28, marginLeft: 8, marginRight: 4 },
  rowRight: { alignItems: "center", justifyContent: "center", minWidth: 36 },

  // Floating Action Button (visible cuando hay hijos)
  fab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    backgroundColor: "#3557F5",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  fabTxt: { color: "white", fontWeight: "900", fontSize: 15 },
});
