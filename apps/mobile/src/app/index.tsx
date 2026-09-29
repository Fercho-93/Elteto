import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SHADOW } from "../theme";
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
  container: { flex: 1, backgroundColor: COLORS.ink, padding: 26, justifyContent: "center", gap: 14 },
  title: { fontSize: 54, fontWeight: "900", color: COLORS.citrus, textAlign: "center", letterSpacing: -2, textShadowColor: COLORS.pinkDark, textShadowOffset: { width: 3, height: 4 }, textShadowRadius: 0 },
  subtitle: { fontSize: 18, lineHeight: 25, fontWeight: "700", color: COLORS.paper, textAlign: "center", marginBottom: 4 },
  hint: { fontSize: 14, lineHeight: 20, color: COLORS.muted, textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: COLORS.cyan, paddingVertical: 17, paddingHorizontal: 18, borderRadius: 14, borderWidth: 3, borderColor: COLORS.black, alignItems: "center", marginTop: 10, ...SHADOW },
  primary: { backgroundColor: COLORS.pink },
  buttonText: { color: COLORS.black, fontSize: 18, fontWeight: "900", letterSpacing: 0.3 },
});
