import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../../src/lib/api";

type DriverRouteProp = RouteProp<RootStackParamList, "Driver">;

export default function DriverScreen() {
  const route = useRoute<DriverRouteProp>();
  const { busId } = route.params;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("FUERA_DE_SERVICIO");

  // 🔹 Traer estado inicial del bus
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get(`/buses/${busId}/location`);
        if (data?.status) {
          setStatus(data.status);
        }
      } catch (err) {
        console.warn("Error obteniendo estado inicial:", err);
      }
    };
    fetchStatus();
  }, [busId]);

  const handleAction = async (action: "start" | "end" | "reset") => {
    setLoading(true);
    try {
      const { data } = await api.post(`/buses/${busId}/${action}`);
      setStatus(data?.status ?? "SIN_DATOS");
      Alert.alert(
        "Éxito",
        `Ruta ${action === "start" ? "iniciada" : action === "end" ? "finalizada" : "reiniciada"}`
      );
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "No se pudo realizar la acción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantalla del Conductor</Text>
      <Text style={styles.text}>Bus ID: {busId}</Text>
      <Text style={styles.text}>Estado actual: {status}</Text>

      {loading && (
        <ActivityIndicator size="large" color="#3557F5" style={{ marginVertical: 10 }} />
      )}

      <View style={styles.buttons}>
        <Button
          title="🟢 Iniciar Ruta"
          onPress={() => handleAction("start")}
          disabled={status !== "FUERA_DE_SERVICIO"}
        />
      </View>

      <View style={styles.buttons}>
        <Button
          title="🏫 Finalizar Ruta"
          color="#E67E22"
          onPress={() => handleAction("end")}
          disabled={status !== "EN_RUTA"}
        />
      </View>

      <View style={styles.buttons}>
        <Button
          title="🔄 Reiniciar Ruta"
          color="#C0392B"
          onPress={() => handleAction("reset")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  text: { fontSize: 16, marginBottom: 10 },
  buttons: { marginVertical: 6, width: "80%" },
});
