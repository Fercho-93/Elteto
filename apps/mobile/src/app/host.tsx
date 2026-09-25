import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { listGames } from "game-core";
import { useGameSession } from "../state/GameSession";

export default function HostScreen() {
  const router = useRouter();
  const { hostRoom } = useGameSession();
  const games = useMemo(() => listGames(), []);
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [hostName, setHostName] = useState("");
  const [roomName, setRoomName] = useState("Partida de " + (hostName || "alguien"));

  const canCreate = hostName.trim().length > 0 && gameId.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Elige el juego</Text>
      <FlatList
        data={games}
        keyExtractor={(g) => g.id}
        horizontal
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setGameId(item.id)}
            style={[styles.gameChip, gameId === item.id && styles.gameChipSelected]}
          >
            <Text style={[styles.gameChipText, gameId === item.id && styles.gameChipTextSelected]}>
              {item.label} · {item.minPlayers === item.maxPlayers ? `${item.minPlayers} jug.` : `${item.minPlayers}-${item.maxPlayers} jug.`}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ gap: 8 }}
      />

      <Text style={styles.label}>Tu nombre</Text>
      <TextInput style={styles.input} placeholder="p.ej. Fernando" placeholderTextColor="#8fb99e" value={hostName} onChangeText={setHostName} />

      <Text style={styles.label}>Nombre de la sala</Text>
      <TextInput style={styles.input} placeholder="p.ej. Partida del sábado" placeholderTextColor="#8fb99e" value={roomName} onChangeText={setRoomName} />

      <Pressable
        disabled={!canCreate}
        style={[styles.button, !canCreate && styles.buttonDisabled]}
        onPress={() => {
          hostRoom(gameId, hostName.trim(), roomName.trim() || `Partida de ${hostName.trim()}`);
          router.replace("/lobby");
        }}
      >
        <Text style={styles.buttonText}>Crear sala y esperar jugadores</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d26", padding: 20, gap: 8 },
  label: { color: "#d7f0e2", fontSize: 14, marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: "#124a30", color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  gameChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: "#124a30", borderWidth: 1, borderColor: "#1f8a4c" },
  gameChipSelected: { backgroundColor: "#1f8a4c" },
  gameChipText: { color: "#cfe9db" },
  gameChipTextSelected: { color: "#fff", fontWeight: "700" },
  button: { backgroundColor: "#1f8a4c", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 28 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
