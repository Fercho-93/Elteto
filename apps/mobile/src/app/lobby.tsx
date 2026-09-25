import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { getGame } from "game-core";
import { useGameSession } from "../state/GameSession";

export default function LobbyScreen() {
  const router = useRouter();
  const { role, gameId, players, started, error, startGame, leave } = useGameSession();

  useEffect(() => {
    if (started) router.replace("/game");
  }, [started, router]);

  const engine = gameId ? getGame(gameId) : null;
  const enoughPlayers = engine ? players.length >= engine.minPlayers : false;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{engine?.label ?? "Cargando..."}</Text>
      <Text style={styles.subtitle}>
        {role === "host" ? "Comparte tu WiFi/hotspot: los demás se conectarán automáticamente." : "Esperando a que el anfitrión empiece la partida."}
      </Text>

      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.isHost && <Text style={styles.hostBadge}>Anfitrión</Text>}
          </View>
        )}
        contentContainerStyle={{ gap: 8, marginTop: 16 }}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {role === "host" && (
        <Pressable disabled={!enoughPlayers} style={[styles.button, !enoughPlayers && styles.buttonDisabled]} onPress={startGame}>
          <Text style={styles.buttonText}>
            {enoughPlayers ? "Empezar partida" : `Esperando jugadores (${players.length}/${engine?.minPlayers})`}
          </Text>
        </Pressable>
      )}

      <Pressable
        style={styles.leaveButton}
        onPress={() => {
          leave();
          router.replace("/");
        }}
      >
        <Text style={styles.leaveButtonText}>Salir de la sala</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d26", padding: 20 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#cfe9db", fontSize: 14, marginTop: 6 },
  playerRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#124a30", padding: 12, borderRadius: 10 },
  playerName: { color: "#fff", fontSize: 16 },
  hostBadge: { color: "#8ee6b0", fontSize: 12, fontWeight: "700" },
  error: { color: "#ffb4b4", marginTop: 12 },
  button: { backgroundColor: "#1f8a4c", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 28 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  leaveButton: { paddingVertical: 14, alignItems: "center", marginTop: 12 },
  leaveButtonText: { color: "#cfe9db" },
});
