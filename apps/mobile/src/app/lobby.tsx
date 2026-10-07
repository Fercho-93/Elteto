import { useEffect } from "react";
import { COLORS, SHADOW } from "../theme";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { getGame, getGamePlan } from "game-core";
import { useGameSession } from "../state/GameSession";

export default function LobbyScreen() {
  const router = useRouter();
  const { role, gameId, players, started, error, hostAddress, roomName, startGame, fillWithBots, removeBot, leave } = useGameSession();

  useEffect(() => {
    if (started) router.replace("/game");
  }, [started, router]);

  const engine = gameId ? getGame(gameId) : null;
  const enoughPlayers = engine ? getGamePlan(engine.id).players.includes(players.length) : false;
  const roomFull = engine ? players.length >= engine.maxPlayers : false;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{roomName || engine?.label || "Cargando..."}</Text>
      <Text style={styles.subtitle}>
        {role === "host" ? "Pasa la IP a quienes vayan a jugar contigo. Debéis estar en la misma Wi-Fi o hotspot." : "Esperando a que el anfitrión empiece la partida."}
      </Text>

      {role === "host" && (
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>IP DE LA SALA</Text>
          <Text selectable style={styles.address}>{hostAddress ? hostAddress : "Busca la IP local en los ajustes de Wi-Fi"}</Text>
          {<Text style={styles.addressHint}>{hostAddress ? "El puerto ya está configurado. Comparte solo esta IP." : "En iPhone: Ajustes → Wi-Fi → toca ⓘ junto a la red conectada. Comparte la dirección IPv4."}</Text>}
        </View>
      )}

      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.isHost && <Text style={styles.hostBadge}>Anfitrión</Text>}
            {item.isBot && (role === 'host' ? <Pressable accessibilityLabel={`Quitar a ${item.name}`} onPress={() => removeBot(item.id)}><Text style={styles.hostBadge}>IA · Quitar</Text></Pressable> : <Text style={styles.hostBadge}>IA</Text>)}
          </View>
        )}
        contentContainerStyle={{ gap: 8, marginTop: 16 }}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {role === 'host' && !roomFull && <Pressable style={styles.button} onPress={fillWithBots}><Text style={styles.buttonText}>Completar mesa con IA</Text></Pressable>}

      {role === "host" && (
        <Pressable disabled={!enoughPlayers} style={[styles.button, !enoughPlayers && styles.buttonDisabled]} onPress={startGame}>
          <Text style={styles.buttonText}>
            {enoughPlayers
            ? roomFull
              ? `Empezar partida (${players.length}/${engine?.maxPlayers})`
              : "Empezar partida"
            : `Esperando jugadores (${players.length}/${engine?.minPlayers})`}
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
  container: { flex: 1, backgroundColor: COLORS.ink, padding: 22 },
  title: { color: COLORS.citrus, fontSize: 32, fontWeight: "900", letterSpacing: -0.6 },
  subtitle: { color: COLORS.paper, fontSize: 15, lineHeight: 21, marginTop: 8 },
  addressCard: { backgroundColor: COLORS.cyan, borderWidth: 3, borderColor: COLORS.black, borderRadius: 14, padding: 15, marginTop: 18, ...SHADOW },
  addressLabel: { color: COLORS.black, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  address: { color: COLORS.black, fontSize: 21, fontWeight: "900", marginTop: 6 },
  addressHint: { color: COLORS.black, fontSize: 13, lineHeight: 19, marginTop: 7 },
  playerRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: COLORS.plum, padding: 14, borderRadius: 13, borderWidth: 2, borderColor: COLORS.black },
  playerName: { color: COLORS.paper, fontSize: 16, fontWeight: "800" },
  hostBadge: { color: COLORS.citrus, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  error: { color: COLORS.red, marginTop: 12, fontWeight: "800" },
  button: { backgroundColor: COLORS.pink, paddingVertical: 17, paddingHorizontal: 14, borderWidth: 3, borderColor: COLORS.black, borderRadius: 14, alignItems: "center", marginTop: 28, ...SHADOW },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: "900" },
  leaveButton: { paddingVertical: 14, alignItems: "center", marginTop: 12 },
  leaveButtonText: { color: COLORS.muted, fontWeight: "800" },
});
