import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { COLORS, SHADOW } from "../theme";
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
  container: { flex: 1, backgroundColor: COLORS.ink, padding: 16 },
  banner: { color: COLORS.black, backgroundColor: COLORS.citrus, borderWidth: 2, borderColor: COLORS.black, borderRadius: 12, padding: 10, fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 10, ...SHADOW },
  sectionTitle: { color: COLORS.citrus, fontSize: 12, fontWeight: "900", marginTop: 14, letterSpacing: 1.2, textTransform: "uppercase" },
  table: { backgroundColor: COLORS.plum, borderWidth: 2, borderColor: COLORS.black, borderRadius: 14, padding: 12, marginTop: 5, ...SHADOW },
  tableRow: { color: COLORS.paper, fontSize: 15, fontWeight: "800", lineHeight: 23 },
  dim: { color: COLORS.muted },
  playerLine: { color: COLORS.paper, backgroundColor: COLORS.plum, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 },
  playerTurn: { color: COLORS.black, backgroundColor: COLORS.cyan, fontWeight: "900" },
  error: { color: COLORS.red, marginTop: 8, fontWeight: "800" },
  passButton: { backgroundColor: COLORS.orange, borderWidth: 3, borderColor: COLORS.black, paddingVertical: 13, borderRadius: 12, alignItems: "center", marginTop: 8, ...SHADOW },
  disabled: { opacity: 0.4 },
  passButtonText: { color: COLORS.black, fontWeight: "900" },
  log: { maxHeight: 120, marginTop: 5, backgroundColor: COLORS.plum, borderRadius: 10, padding: 8 },
  logLine: { color: COLORS.paper, fontSize: 12, lineHeight: 17 },
});
