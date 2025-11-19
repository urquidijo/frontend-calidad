import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/src/store/auth";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const okEmail = /^\S+@\S+\.\S+$/.test(email.trim());
    return okEmail && password.length >= 6 && !loading;
  }, [email, password, loading]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert(
        "No se pudo iniciar sesión",
        e?.response?.data?.message ?? "Revisa tus credenciales e intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left"]}>
      <StatusBar translucent={false} barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header visual */}
            <View style={styles.headerWrap}>
              <View style={styles.headerBlob} />
              <View style={[styles.headerBlob, { right: -48, bottom: -48, opacity: 0.18 }]} />
              <View style={styles.brandRow}>
                <Text style={styles.logoBadge}>🚌</Text>
                <View>
                  <Text style={styles.brandTitle}>SchoolBus Tracker</Text>
                  <Text style={styles.brandSubtitle}>
                    Acceso para familias
                  </Text>
                </View>
              </View>
            </View>

            {/* Card formulario */}
            <View style={styles.formCard}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  testID="login-email"  
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tucorreo@ejemplo.com"
                  placeholderTextColor="#9AA6BF"
                  autoCapitalize="none"
                  inputMode="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    testID="login-password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#9AA6BF"
                    secureTextEntry={secure}
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    style={[styles.input, { flex: 1, paddingRight: 44 }]}
                  />
                  <Pressable onPress={() => setSecure(v => !v)} hitSlop={12} style={styles.eyeBtn}>
                    <Text style={styles.eyeTxt}>{secure ? "👁️‍🗨️" : "👁️"}</Text>
                  </Pressable>
                </View>

                
              </View>

              <Pressable
                testID="login-button"
                onPress={onSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !canSubmit && { opacity: 0.55 },
                  pressed && canSubmit && { transform: [{ scale: 0.98 }] },
                ]}
              >
                {loading ? <ActivityIndicator /> : <Text style={styles.submitTxt}>Ingresar</Text>}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.divider} />
              </View>

              <Pressable
                testID="login-register-button"
                onPress={() => nav.navigate("Register")}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.secondaryTxt}>Crear cuenta</Text>
              </Pressable>

              <Text style={styles.footerHint}>
                Al ingresar aceptas nuestras condiciones y política de privacidad.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FB" },
  scrollContent: { paddingBottom: 24 },

  headerWrap: {
    height: 160,
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
  brandTitle: { fontSize: 20, fontWeight: "800", color: "#12254A" }, // más contraste
  brandSubtitle: { fontSize: 15, color: "#31466F", margin: 5 }, // más oscuro

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

  passwordRow: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { position: "absolute", right: 8, padding: 6, borderRadius: 8 },
  eyeTxt: { fontSize: 16 },

  forgot: { marginTop: 6, color: "#3557F5", fontSize: 12 },

  submitBtn: {
    backgroundColor: "#3557F5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitTxt: { color: "white", fontWeight: "700", fontSize: 16 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  divider: { flex: 1, height: 1, backgroundColor: "#E7ECF5" },
  dividerText: { color: "#7E8BA5", fontSize: 12 },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#D8E0EF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryTxt: { color: "#12254A", fontWeight: "700" },

  footerHint: { textAlign: "center", color: "#8D98B2", fontSize: 11, marginTop: 6 },
});
