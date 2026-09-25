import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Elteto</Text>
      <Text style={styles.subtitle}>Juegos de cartas multijugador, cada uno con su móvil, sin necesidad de internet.</Text>
      <Text style={styles.hint}>Conecta todos los móviles a la misma WiFi, o crea un hotspot desde uno de ellos.</Text>

      <Link href="/host" asChild>
        <Pressable style={[styles.button, styles.primary]}>
          <Text style={styles.buttonText}>Crear partida</Text>
        </Pressable>
      </Link>

      <Link href="/join" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Unirse a una partida</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d26", padding: 24, justifyContent: "center", gap: 12 },
  title: { fontSize: 40, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#d7f0e2", textAlign: "center", marginBottom: 4 },
  hint: { fontSize: 13, color: "#a9cdb9", textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#145c3a", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 12 },
  primary: { backgroundColor: "#1f8a4c" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
