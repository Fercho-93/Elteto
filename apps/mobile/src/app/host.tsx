import { useMemo, useState } from "react";
import { COLORS, SHADOW } from "../theme";
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
  const [roomName, setRoomName] = useState("");

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
      <TextInput style={styles.input} placeholder="p.ej. La jefa de la mesa" placeholderTextColor="#8E7B88" value={hostName} onChangeText={setHostName} />

      <Text style={styles.label}>Nombre de la sala</Text>
      <TextInput style={styles.input} placeholder={`p.ej. La timba de ${hostName || "esta noche"}`} placeholderTextColor="#8fb99e" value={roomName} onChangeText={setRoomName} />

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
  container: { flex: 1, backgroundColor: COLORS.ink, padding: 22, gap: 8 },
  label: { color: COLORS.citrus, fontSize: 13, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: COLORS.paper, color: COLORS.black, borderWidth: 3, borderColor: COLORS.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontWeight: "700", ...SHADOW },
  gameChip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, backgroundColor: COLORS.plum, borderWidth: 2, borderColor: COLORS.black },
  gameChipSelected: { backgroundColor: COLORS.citrus, transform: [{ rotate: "-1deg" }], ...SHADOW },
  gameChipText: { color: COLORS.paper, fontWeight: "700" },
  gameChipTextSelected: { color: COLORS.black, fontWeight: "900" },
  button: { backgroundColor: COLORS.pink, paddingVertical: 17, paddingHorizontal: 14, borderWidth: 3, borderColor: COLORS.black, borderRadius: 14, alignItems: "center", marginTop: 28, ...SHADOW },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: "900" },
});
