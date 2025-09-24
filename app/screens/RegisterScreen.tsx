// screens/RegisterScreen.tsx
import React, { useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { api } from "../../src/lib/api";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export default function RegisterScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  // UI states for nicer messages
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 visible

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const passOk = useMemo(() => password.length >= 6, [password]);
  const nombreOk = useMemo(() => nombre.trim().length >= 2, [nombre]);

  const canSubmit = emailOk && passOk && nombreOk && !loading;

  // Helper to show error banner (animated)
  const showError = (msg: string) => {
    setErrorMessage(msg);
    Animated.timing(errorAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // auto hide after 4s
    setTimeout(() => {
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setErrorMessage(null));
    }, 4000);
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      const { data } = await api.post("/auth/register", {
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim() || undefined,
        password,
      });

      await SecureStore.setItemAsync("token", data.access_token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));

      // show success modal instead of Alert
      setSuccessVisible(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "No se pudo crear la cuenta. Intenta de nuevo.";
      // show our animated banner
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Called when user closes success modal
  const handleSuccessClose = () => {
    setSuccessVisible(false);
    // redirect to Login (replace so back doesn't return)
    nav.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      {/* Error animated banner */}
      {errorMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.errorBanner,
            {
              transform: [
                {
                  translateY: errorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-60, 12], // slide from top
                  }),
                },
              ],
              opacity: errorAnim,
            },
          ]}
        >
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Animated.View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="always"
          >
            {/* Header visual */}
            <View style={styles.headerWrap}>
              <View style={styles.headerBlob} />
              <View style={[styles.headerBlob, { right: -48, bottom: -48, opacity: 0.18 }]} />
              <View style={styles.brandRow}>
                <Text style={styles.logoBadge}>🚌</Text>
                <View>
                  <Text style={styles.brandTitle}>SchoolBus Tracker</Text>
                  <Text style={styles.brandSubtitle}>Crea tu cuenta</Text>
                </View>
              </View>
            </View>

            {/* Card formulario */}
            <View style={styles.formCard}>
              {/* Nombre */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej: Ana Pérez"
                  placeholderTextColor="#9AA6BF"
                  returnKeyType="next"
                  style={[styles.input, nombre.length > 0 && !nombreOk && styles.inputError]}
                />
                {nombre.length > 0 && !nombreOk && <Text style={styles.helpText}>Escribe al menos 2 caracteres.</Text>}
              </View>

              {/* Email */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tucorreo@ejemplo.com"
                  placeholderTextColor="#9AA6BF"
                  autoCapitalize="none"
                  inputMode="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  style={[styles.input, email.length > 0 && !emailOk && styles.inputError]}
                />
                {email.length > 0 && !emailOk && <Text style={styles.helpText}>Formato de correo no válido.</Text>}
              </View>

              {/* Teléfono */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Teléfono (opcional)</Text>
                <TextInput
                  value={telefono}
                  onChangeText={(t) => {
                    const filtered = t.replace(/[^\d+]/g, "").slice(0, 15);
                    setTelefono(filtered);
                  }}
                  placeholder="+591 70000000"
                  placeholderTextColor="#9AA6BF"
                  inputMode="tel"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9AA6BF"
                    secureTextEntry={secure}
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    style={[styles.input, { flex: 1, paddingRight: 44 }, password.length > 0 && !passOk && styles.inputError]}
                  />
                  <Pressable onPress={() => setSecure((v) => !v)} hitSlop={12} style={styles.eyeBtn}>
                    <Text style={styles.eyeTxt}>{secure ? "👁️‍🗨️" : "👁️"}</Text>
                  </Pressable>
                </View>
                {password.length > 0 && !passOk && <Text style={styles.helpText}>Debe tener al menos 6 caracteres.</Text>}
                <View style={styles.meterWrap}>
                  <View style={[styles.meterFill, { width: (Math.min((password.length / 10) * 100, 100) + "%") as any }]} />
                </View>
              </View>

              {/* Botón submit */}
              <Pressable
                onPress={onSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [styles.submitBtn, !canSubmit && { opacity: 0.55 }, pressed && canSubmit && { transform: [{ scale: 0.98 }] }]}
              >
                {loading ? <ActivityIndicator /> : <Text style={styles.submitTxt}>Crear cuenta</Text>}
              </Pressable>

              {/* Legal */}
              <Text style={styles.footerHint}>Al registrarte aceptas nuestras condiciones y política de privacidad.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Success modal */}
      <Modal visible={successVisible} transparent animationType="fade" onRequestClose={handleSuccessClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>Cuenta creada</Text>
            <Text style={styles.modalMsg}>¡Tu cuenta fue creada con éxito! Ahora puedes iniciar sesión.</Text>

            <Pressable onPress={handleSuccessClose} style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.95 }]}>
              <Text style={styles.modalBtnTxt}>Ir a iniciar sesión</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* styles (copiados y adaptados de tu original + nuevos estilos para mensajes) */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB" },
  scrollContent: { paddingBottom: 24 },

  headerWrap: {
    height: 136,
    backgroundColor: "#E7EEFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 14,
  },
  headerBlob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#C9D9FF",
    top: -56,
    left: -56,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBadge: {
    fontSize: 26,
    backgroundColor: "white",
    width: 42,
    height: 42,
    borderRadius: 12,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  brandTitle: { fontSize: 20, fontWeight: "800", color: "#12254A" },
  brandSubtitle: { fontSize: 12, color: "#31466F", margin: 5 },

  formCard: {
    marginTop: -18,
    marginHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  fieldBlock: { gap: 6 },
  label: { fontSize: 13, color: "#2B3E63" },
  input: {
    borderWidth: 1,
    borderColor: "#D8E0EF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    backgroundColor: "#FAFBFF",
    color: "#0E1C3A",
  },
  inputError: { borderColor: "#F59E0B" },

  helpText: {
    color: "#B45309",
    fontSize: 12,
    marginTop: 4,
  },

  passwordRow: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { position: "absolute", right: 8, padding: 6, borderRadius: 8 },
  eyeTxt: { fontSize: 16 },

  meterWrap: {
    height: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 6,
  },
  meterFill: {
    height: "100%",
    backgroundColor: "#3557F5",
  },

  submitBtn: {
    backgroundColor: "#3557F5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitTxt: { color: "white", fontWeight: "700", fontSize: 16 },

  footerHint: {
    textAlign: "center",
    color: "#8D98B2",
    fontSize: 11,
    marginTop: 6,
  },

  /* --- nuevo: banner de error --- */
  errorBanner: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    zIndex: 999,
  },
  errorText: { color: "#991B1B", fontWeight: "700", textAlign: "center" },

  /* --- nuevo: modal de éxito --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6,10,21,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
  },
  modalIcon: { fontSize: 44, marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#12254A", marginTop: 6 },
  modalMsg: { color: "#6B7896", textAlign: "center", marginTop: 8, marginBottom: 18 },
  modalBtn: { backgroundColor: "#3557F5", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  modalBtnTxt: { color: "white", fontWeight: "800" },
});
