import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import type { CinquilloView } from "game-core";
import { FRENCH_RANKS } from "game-core";
import { CardView } from "./CardView";
import { useGameSession } from "../state/GameSession";

function sequenceLabel(suit: string, entry: { low: number; high: number } | undefined) {
  if (!entry) return `${suit}: vacío`;
  return `${suit}: ${FRENCH_RANKS[entry.low]} ... ${FRENCH_RANKS[entry.high]}`;
}

export function CinquilloScreen({ view }: { view: CinquilloView }) {
  const { playerId, sendAction, error } = useGameSession();
  const isMyTurn = view.turnPlayer === playerId;

  return (
    <View style={styles.container}>
      {view.finished && (
        <Text style={styles.banner}>{view.winner ? `¡${view.winner} gana la partida!` : "Nadie puede jugar más: partida bloqueada."}</Text>
      )}

      <Text style={styles.sectionTitle}>Mesa</Text>
      <View style={styles.table}>
        {Object.keys(view.table).length === 0 && <Text style={styles.dim}>Aún no hay cartas en la mesa.</Text>}
        {Object.entries(view.table).map(([suit, entry]) => (
          <Text key={suit} style={styles.tableRow}>
            {sequenceLabel(suit, entry)}
          </Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Jugadores</Text>
      {view.players.map((p) => (
        <Text key={p} style={[styles.playerLine, p === view.turnPlayer && styles.playerTurn]}>
          {p} — {view.handSizes[p]} carta(s){p === view.turnPlayer ? "  ⬅ turno" : ""}
        </Text>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Tu mano</Text>
      <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }}>
        {view.myHand.map((c, i) => (
          <CardView key={`${c.suit}-${c.rank}-${i}`} card={c} disabled={!isMyTurn} onPress={() => sendAction({ type: "play", card: c })} />
        ))}
      </ScrollView>

      <Pressable disabled={!isMyTurn} style={[styles.passButton, !isMyTurn && styles.disabled]} onPress={() => sendAction({ type: "pass" })}>
        <Text style={styles.passButtonText}>Paso</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Historial</Text>
      <ScrollView style={styles.log}>
        {view.log.map((l, i) => (
          <Text key={i} style={styles.logLine}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d26", padding: 16 },
  banner: { color: "#8ee6b0", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  sectionTitle: { color: "#cfe9db", fontSize: 13, fontWeight: "700", marginTop: 12, textTransform: "uppercase" },
  table: { backgroundColor: "#124a30", borderRadius: 10, padding: 10, marginTop: 4 },
  tableRow: { color: "#fff", fontSize: 14 },
  dim: { color: "#8fb99e" },
  playerLine: { color: "#d7f0e2" },
  playerTurn: { color: "#fff", fontWeight: "800" },
  error: { color: "#ffb4b4", marginTop: 8 },
  passButton: { backgroundColor: "#7a4a1f", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.4 },
  passButtonText: { color: "#fff", fontWeight: "700" },
  log: { maxHeight: 120, marginTop: 4 },
  logLine: { color: "#a9cdb9", fontSize: 12 },
});
