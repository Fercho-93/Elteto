import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from "react-native";
import type { Card, MusView } from "game-core";
import { CardView } from "./CardView";
import { useGameSession } from "../state/GameSession";

function sameCard(a: Card, b: Card) {
  return a.suit === b.suit && a.rank === b.rank;
}

export function MusScreen({ view }: { view: MusView }) {
  const { playerId, sendAction, error } = useGameSession();
  const [selected, setSelected] = useState<Card[]>([]);
  const [betAmount, setBetAmount] = useState("2");

  const isMyTurnToBet = view.turnPlayer === playerId;
  const iHaveDiscarded = !view.awaitingDiscardFrom.includes(playerId ?? "");
  const respondingToOpponent = view.betting?.pendingBet && view.betting.pendingBet.team !== teamGuess(view, playerId);

  return (
    <View style={styles.container}>
      {view.finished && <Text style={styles.banner}>¡Equipo {view.winnerTeam} gana la partida!</Text>}

      <View style={styles.scoreRow}>
        <Text style={styles.score}>Equipo A: {view.scores.A}</Text>
        <Text style={styles.score}>Equipo B: {view.scores.B}</Text>
        <Text style={styles.score}>Meta: {view.targetScore}</Text>
      </View>

      <Text style={styles.phase}>Fase: {view.phase.toUpperCase()} · Mano: {view.mano}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Tu mano</Text>
      <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }}>
        {view.myHand.map((c, i) => (
          <CardView
            key={`${c.suit}-${c.rank}-${i}`}
            card={c}
            selected={selected.some((s) => sameCard(s, c))}
            disabled={view.phase !== "discard" || iHaveDiscarded}
            onPress={() => {
              setSelected((prev) => (prev.some((s) => sameCard(s, c)) ? prev.filter((s) => !sameCard(s, c)) : [...prev, c]));
            }}
          />
        ))}
      </ScrollView>

      {view.phase === "discard" && !iHaveDiscarded && (
        <Pressable style={styles.actionButton} onPress={() => sendAction({ type: "discard", cards: selected })}>
          <Text style={styles.actionButtonText}>
            {selected.length === 0 ? "Confirmar: me quedo con estas cartas" : `Descartar ${selected.length} carta(s)`}
          </Text>
        </Pressable>
      )}
      {view.phase === "discard" && iHaveDiscarded && (
        <Text style={styles.dim}>Esperando al resto: {view.awaitingDiscardFrom.join(", ") || "..."}</Text>
      )}

      {view.betting && (
        <View style={styles.bettingBox}>
          <Text style={styles.dim}>
            Turno de: {view.turnPlayer} {view.betting.pendingBet ? `· Envite pendiente: ${view.betting.pendingBet.amount} (equipo ${view.betting.pendingBet.team})` : "· sin envite"}
          </Text>
          {isMyTurnToBet && (
            <View style={styles.bettingActions}>
              {!respondingToOpponent && (
                <>
                  <Pressable style={styles.smallButton} onPress={() => sendAction({ type: "pass" })}>
                    <Text style={styles.smallButtonText}>Paso</Text>
                  </Pressable>
                  <TextInput
                    style={styles.betInput}
                    keyboardType="number-pad"
                    value={betAmount}
                    onChangeText={setBetAmount}
                  />
                  <Pressable style={styles.smallButton} onPress={() => sendAction({ type: "bet", amount: Number(betAmount) || 2 })}>
                    <Text style={styles.smallButtonText}>Envido</Text>
                  </Pressable>
                </>
              )}
              {respondingToOpponent && (
                <>
                  <Pressable style={styles.smallButton} onPress={() => sendAction({ type: "accept" })}>
                    <Text style={styles.smallButtonText}>Quiero</Text>
                  </Pressable>
                  <Pressable style={styles.smallButton} onPress={() => sendAction({ type: "reject" })}>
                    <Text style={styles.smallButtonText}>No quiero</Text>
                  </Pressable>
                  <TextInput style={styles.betInput} keyboardType="number-pad" value={betAmount} onChangeText={setBetAmount} />
                  <Pressable style={styles.smallButton} onPress={() => sendAction({ type: "bet", amount: Number(betAmount) || 2 })}>
                    <Text style={styles.smallButtonText}>Subir</Text>
                  </Pressable>
                </>
              )}
              <Pressable style={[styles.smallButton, styles.ordago]} onPress={() => sendAction({ type: "ordago" })}>
                <Text style={styles.smallButtonText}>¡Órdago!</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

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

// El cliente no conoce los asientos exactos (solo host los sabe con certeza), pero equipo A
// son los asientos 0 y 2 y equipo B los asientos 1 y 3; usamos la posición en `players` como
// aproximación para decidir qué botones mostrar (host valida igualmente cada acción).
function teamGuess(view: MusView, playerId: string | null): "A" | "B" | null {
  if (!playerId) return null;
  const seat = view.players.indexOf(playerId);
  if (seat < 0) return null;
  return seat % 2 === 0 ? "A" : "B";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b3d26", padding: 16 },
  banner: { color: "#8ee6b0", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between" },
  score: { color: "#fff", fontWeight: "700" },
  phase: { color: "#cfe9db", marginTop: 8, fontWeight: "700" },
  error: { color: "#ffb4b4", marginTop: 8 },
  sectionTitle: { color: "#cfe9db", fontSize: 13, fontWeight: "700", marginTop: 12, textTransform: "uppercase" },
  dim: { color: "#a9cdb9", marginTop: 4 },
  actionButton: { backgroundColor: "#1f8a4c", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  actionButtonText: { color: "#fff", fontWeight: "700" },
  bettingBox: { backgroundColor: "#124a30", borderRadius: 10, padding: 10, marginTop: 10 },
  bettingActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" },
  smallButton: { backgroundColor: "#1f8a4c", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  ordago: { backgroundColor: "#a3271f" },
  smallButtonText: { color: "#fff", fontWeight: "700" },
  betInput: { backgroundColor: "#0b3d26", color: "#fff", width: 56, textAlign: "center", borderRadius: 8, paddingVertical: 6 },
  log: { maxHeight: 120, marginTop: 4 },
  logLine: { color: "#a9cdb9", fontSize: 12 },
});
