import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { MusView, CinquilloView } from "game-core";
import { useGameSession } from "../state/GameSession";
import { MusScreen } from "../components/MusScreen";
import { CinquilloScreen } from "../components/CinquilloScreen";

export default function GameScreen() {
  const router = useRouter();
  const { gameId, view, leave } = useGameSession();

  if (!view) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Esperando el estado de la partida...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {gameId === "mus" && <MusScreen view={view as MusView} />}
      {gameId === "cinquillo" && <CinquilloScreen view={view as CinquilloView} />}
      {gameId !== "mus" && gameId !== "cinquillo" && <Text style={styles.dim}>Juego no soportado todavía: {gameId}</Text>}

      <Pressable
        style={styles.leaveButton}
        onPress={() => {
          leave();
          router.replace("/");
        }}
      >
        <Text style={styles.leaveButtonText}>Salir de la partida</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#0b3d26", alignItems: "center", justifyContent: "center" },
  dim: { color: "#a9cdb9" },
  leaveButton: { paddingVertical: 12, alignItems: "center", backgroundColor: "#0b3d26" },
  leaveButtonText: { color: "#cfe9db" },
});
