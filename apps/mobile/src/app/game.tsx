import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../theme";
import { useLeaveGuard } from "../hooks/useLeaveGuard";
import type { MusView, CinquilloView } from "game-core";
import { useGameSession } from "../state/GameSession";
import { MusScreen } from "../components/MusScreen";
import { CinquilloScreen } from "../components/CinquilloScreen";

export default function GameScreen() {
  const { gameId, view, leave } = useGameSession();
  const confirmLeave = useLeaveGuard(leave, "¿Salir de la partida?");

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
        onPress={confirmLeave}
      >
        <Text style={styles.leaveButtonText}>Salir de la partida</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.ink, alignItems: "center", justifyContent: "center" },
  dim: { color: COLORS.paper, fontWeight: "700" },
  leaveButton: { paddingVertical: 13, alignItems: "center", backgroundColor: COLORS.night, borderTopWidth: 2, borderColor: COLORS.black },
  leaveButtonText: { color: COLORS.pink, fontWeight: "900", letterSpacing: 0.4 },
});
