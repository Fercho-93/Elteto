import { useEffect, useState } from "react";
import { COLORS, SHADOW } from "../theme";
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
  container: { flex: 1, backgroundColor: COLORS.ink, padding: 22, gap: 8 },
  label: { color: COLORS.citrus, fontSize: 13, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", marginTop: 16, marginBottom: 4 },
  empty: { color: COLORS.muted, fontSize: 14, paddingVertical: 16 },
  input: { backgroundColor: COLORS.paper, color: COLORS.black, borderWidth: 3, borderColor: COLORS.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontWeight: "700", ...SHADOW },
  room: { backgroundColor: COLORS.plum, borderRadius: 14, padding: 15, borderWidth: 2, borderColor: COLORS.black, ...SHADOW },
  roomSelected: { backgroundColor: COLORS.cyan },
  roomTitle: { color: COLORS.paper, fontSize: 17, fontWeight: "900" },
  roomSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  button: { backgroundColor: COLORS.pink, paddingVertical: 17, paddingHorizontal: 14, borderWidth: 3, borderColor: COLORS.black, borderRadius: 14, alignItems: "center", marginTop: 28, ...SHADOW },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: "900" },
});
