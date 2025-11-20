// screens/VerifyStudentScreen.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../src/lib/api";

type Student = { id: string; nombre: string; curso?: string };

export default function VerifyStudentScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "VerifyStudent">>();
  const { schoolId, schoolName } = route.params;

  const [ci, setCi] = useState("");
  const [codigo, setCodigo] = useState("");
  const [found, setFound] = useState<Student | null>(null);
  const [checking, setChecking] = useState(false);
  const [linking, setLinking] = useState(false);

  const ciRef = useRef<TextInput | null>(null);
  const codigoRef = useRef<TextInput | null>(null);

  const resetForm = useCallback(() => {
    setCi("");
    setCodigo("");
    setFound(null);
    Keyboard.dismiss();
    ciRef.current?.focus();
  }, []);

  const avatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h} 70% 92%)`;
  };

  // FORMATEO del código: limpia, mayúsculas y añade '-' después de los 3 primeros caracteres
  const formatCodigo = (input: string) => {
    // normalizar: quitar espacios y caracteres no alfanuméricos
    const raw = input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (raw.length <= 3) return raw;
    // limita la parte después del guión a 9 chars (ajusta si quieres otra longitud)
    const partA = raw.slice(0, 3);
    const partB = raw.slice(3, 12);
    return `${partA}-${partB}`;
  };

  // usar formatCodigo al cambiar el texto
  const onChangeCodigo = (t: string) => {
    setCodigo(formatCodigo(t));
  };

  const onVerify = useCallback(async () => {
    const hasCI = !!ci.trim();
    const hasCodigo = !!codigo.trim();
    if (!hasCI && !hasCodigo) {
      Alert.alert(
        "Faltan datos",
        "Ingresa la CI o el código del estudiante para verificar."
      );
      return;
    }

    try {
      setChecking(true);
      setFound(null);

      const params: Record<string, string | undefined> = {};
      if (hasCI) params.ci = ci.trim();
      if (hasCodigo) params.codigo = codigo.trim();

      const { data } = await api.get(
        `/colegios/${schoolId}/estudiantes/verificar`,
        { params }
      );

      const e = data?.estudiante as null | {
        id: number | string;
        nombre: string;
        curso?: string;
      };
      if (!e) {
        setFound(null);
        Alert.alert(
          "No encontrado",
          "No se encontró un estudiante con esos datos. Revisa e intenta de nuevo."
        );
        return;
      }

      setFound({
        id: String(e.id),
        nombre: e.nombre,
        curso: e.curso ?? undefined,
      });
      Keyboard.dismiss();
    } catch (err: any) {
      console.warn("Verify error:", err);
      const msg =
        err?.response?.data?.message ??
        "No se pudo verificar al estudiante. Intenta nuevamente.";
      Alert.alert("Error", msg);
    } finally {
      setChecking(false);
    }
  }, [ci, codigo, schoolId]);

  const onLink = useCallback(() => {
    if (!found) return;

    Alert.alert(
      "Confirmar vinculación",
      `Vincularás a ${found.nombre} (${
        found.curso ?? "sin curso"
      }) a tu cuenta. ¿Continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Vincular",
          style: "default",
          onPress: async () => {
            try {
              setLinking(true);
              await api.post("/parent/children/link", {
                studentId: found.id,
                schoolId,
              });
              Alert.alert(
                "Vinculado",
                `${found.nombre} fue vinculado a tu cuenta.`,
                [
                  {
                    text: "OK",
                    onPress: () =>
                      nav.reset({
                        index: 0,
                        routes: [{ name: "Home" }],
                      }),
                  },
                ]
              );
            } catch (err: any) {
              console.warn("Link error:", err);
              const msg =
                err?.response?.data?.message ??
                "No se pudo vincular al estudiante.";
              Alert.alert("Error", msg);
            } finally {
              setLinking(false);
            }
          },
        },
      ]
    );
  }, [found, nav, schoolId]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F5F7FB" }}
      edges={["top", "left", "right"]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 12 }}
          >
            <View style={styles.card}>
              <Text style={styles.title}>Colegio</Text>
              <Text style={styles.school} accessibilityRole="header">
                {schoolName}
              </Text>

              <Text style={styles.label}>CI del alumno</Text>
              <TextInput
                ref={ciRef}
                value={ci}
                onChangeText={(t) =>
                  setCi(t.replace(/[^\d]/g, "").slice(0, 15))
                }
                placeholder="Ej: 12345678"
                placeholderTextColor="#9AA6BF"
                keyboardType="number-pad"
                style={styles.input}
                returnKeyType="done"
                editable={!checking && !linking}
                onSubmitEditing={() => {
                  if (!codigo.trim()) {
                    onVerify();
                  } else {
                    codigoRef.current?.focus();
                  }
                }}
                accessibilityLabel="Input CI del alumno"
              />

              <Text style={styles.or}>o</Text>

              <Text style={styles.label}>Código del alumno (del colegio)</Text>
              <TextInput
                ref={codigoRef}
                value={codigo}
                onChangeText={onChangeCodigo}
                autoCapitalize="characters"
                placeholder="Ej: CSM-001"
                placeholderTextColor="#9AA6BF"
                style={styles.input}
                returnKeyType="done"
                editable={!checking && !linking}
                onSubmitEditing={onVerify}
                accessibilityLabel="Input código del alumno"
              />

              <Pressable
                onPress={onVerify}
                disabled={checking || linking || (!ci.trim() && !codigo.trim())}
                style={({ pressed }) => [
                  styles.btn,
                  (checking || linking || (!ci.trim() && !codigo.trim())) && {
                    opacity: 0.55,
                  },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="btn-verificar-alumno"
                testID="btn-verificar-alumno"
                accessibilityState={{
                  disabled:
                    checking || linking || (!ci.trim() && !codigo.trim()),
                }}
              >
                {checking ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.btnTxt}>Verificar</Text>
                )}
              </Pressable>

              {found && (
                <View style={styles.result}>
                  <View style={styles.foundRow}>
                    <View
                      style={[
                        styles.foundAvatar,
                        { backgroundColor: avatarColor(found.id) },
                      ]}
                    >
                      <Text style={styles.foundAvatarTxt}>
                        {found.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foundName}>{found.nombre}</Text>
                      <Text style={styles.meta}>
                        {found.curso ?? "Sin curso"}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={onLink}
                    disabled={linking}
                    style={({ pressed }) => [
                      styles.linkBtn,
                      linking && { opacity: 0.7 },
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="btn-vincular-alumno"
                    testID="btn-vincular-alumno"
                  >
                    {linking ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.linkTxt}>Vincular a mi cuenta</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setFound(null);
                      setCodigo("");
                      setCi("");
                      ciRef.current?.focus();
                    }}
                    style={({ pressed }) => [
                      { marginTop: 8, alignSelf: "center" },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={{ color: "#6B7896" }}>
                      Verificar otro alumno
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    elevation: 2,
  },
  title: { color: "#6B7896", fontSize: 12 },
  school: {
    color: "#12254A",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  label: { fontSize: 13, color: "#2B3E63" },
  input: {
    borderWidth: 1,
    borderColor: "#D8E0EF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "#FAFBFF",
    color: "#0E1C3A",
    fontSize: 15,
  },

  or: { textAlign: "center", color: "#8A95AC", marginVertical: 6 },

  btn: {
    backgroundColor: "#3557F5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnTxt: { color: "white", fontWeight: "700" },

  result: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2FF",
    gap: 10,
  },
  foundRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  foundAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  foundAvatarTxt: { fontWeight: "900", color: "#12254A", fontSize: 22 },

  foundName: { fontWeight: "800", color: "#12254A", fontSize: 16 },
  meta: { color: "#6B7896" },

  linkBtn: {
    backgroundColor: "#0E9F6E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  linkTxt: { color: "white", fontWeight: "700" },
});
