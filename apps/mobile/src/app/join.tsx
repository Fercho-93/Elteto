import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useGameSession } from "../state/GameSession";
import { DiscoveredHost } from "../net/discovery";

export default function JoinScreen() {
  const router = useRouter();
  const { scanForRooms, discoveredHosts, joinRoom } = useGameSession();
  const [playerName, setPlayerName] = useState("");
  const [selected, setSelected] = useState<DiscoveredHost | null>(null);

  useEffect(() => {
    const stop = scanForRooms();
    return stop;
  }, [scanForRooms]);

  const canJoin = playerName.trim().length > 0 && selected !== null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Salas encontradas en tu red</Text>
      <FlatList
        data={discoveredHosts}
        keyExtractor={(h) => `${h.address}:${h.port}`}
        ListEmptyComponent={<Text style={styles.empty}>Buscando... asegúrate de estar en la misma WiFi o hotspot que el anfitrión.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={[styles.room, selected?.address === item.address && selected?.port === item.port && styles.roomSelected]}
          >
            <Text style={styles.roomTitle}>{item.roomName}</Text>
            <Text style={styles.roomSubtitle}>
              Anfitrión: {item.hostName} · Juego: {item.gameId} · {item.playerCount} jugador(es)
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ gap: 8 }}
      />

      <Text style={styles.label}>Tu nombre</Text>
      <TextInput style={styles.input} placeholder="p.ej. Fernando" placeholderTextColor="#8fb99e" value={playerName} onChangeText={setPlayerName} />

      <Pressable
        disabled={!canJoin}
        style={[styles.button, !canJoin && styles.buttonDisabled]}
        onPress={() => {
          if (!selected) return;
          joinRoom(selected, playerName.trim());
          router.replace("/lobby");
        }}
      >
        <Text style={styles.buttonText}>Unirse a la sala</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d26", padding: 20, gap: 8 },
  label: { color: "#d7f0e2", fontSize: 14, marginTop: 16, marginBottom: 4 },
  empty: { color: "#a9cdb9", fontSize: 14, paddingVertical: 16 },
  input: { backgroundColor: "#124a30", color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  room: { backgroundColor: "#124a30", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#1f8a4c" },
  roomSelected: { backgroundColor: "#1f8a4c" },
  roomTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  roomSubtitle: { color: "#cfe9db", fontSize: 13, marginTop: 2 },
  button: { backgroundColor: "#1f8a4c", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 28 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
