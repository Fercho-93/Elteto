import { useState } from "react";
import { COLORS, SHADOW } from "../theme";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
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
  const respondingToOpponent =
    view.betting?.pendingBet &&
    view.betting.pendingBet.team !== teamGuess(view, playerId);

  return (
    <View style={styles.container}>
      {view.finished && (
        <Text style={styles.banner}>
          ¡Equipo {view.winnerTeam} gana la partida!
        </Text>
      )}

      <View style={styles.scoreRow}>
        <Text style={styles.score}>Equipo A: {view.scores.A}</Text>
        <Text style={styles.score}>Equipo B: {view.scores.B}</Text>
        <Text style={styles.score}>Meta: {view.targetScore} · Juegos A {view.gamesWon.A} / B {view.gamesWon.B} · Primero a {view.targetGames}</Text>
      </View>

      <Text style={styles.phase}>
        Fase: {view.phase.toUpperCase()} · Mano: {view.mano}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {view.phase === "mus" && view.turnPlayer === playerId && (
        <View style={styles.bettingActions}>
          <Pressable
            style={styles.smallButton}
            onPress={() => sendAction({ type: "mus", wantsMus: true })}
          >
            <Text style={styles.smallButtonText}>Mus</Text>
          </Pressable>
          <Pressable
            style={styles.smallButton}
            onPress={() => sendAction({ type: "mus", wantsMus: false })}
          >
            <Text style={styles.smallButtonText}>No hay mus</Text>
          </Pressable>
        </View>
      )}
      {view.revealedHands && (
        <View>
          {view.players.map((id) => (
            <View key={id}>
              <Text style={styles.dim}>{id}</Text>
              <View style={styles.bettingActions}>
                {view.revealedHands![id].map((c) => (
                  <CardView key={`${c.suit}:${c.rank}`} card={c} disabled />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      {view.phase === "showdown" && view.mano === playerId && (
        <Pressable
          style={styles.actionButton}
          onPress={() => sendAction({ type: "next-hand" })}
        >
          <Text style={styles.actionButtonText}>Siguiente mano</Text>
        </Pressable>
      )}
      <Text style={styles.sectionTitle}>Tu mano</Text>
      <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }}>
        {view.myHand.map((c, i) => (
          <CardView
            key={`${c.suit}-${c.rank}-${i}`}
            card={c}
            selected={selected.some((s) => sameCard(s, c))}
            disabled={view.phase !== "discard" || iHaveDiscarded}
            onPress={() => {
              setSelected((prev) =>
                prev.some((s) => sameCard(s, c))
                  ? prev.filter((s) => !sameCard(s, c))
                  : [...prev, c],
              );
            }}
          />
        ))}
      </ScrollView>

      {view.phase === "discard" && !iHaveDiscarded && (
        <Pressable
          disabled={!selected.length}
          style={styles.actionButton}
          onPress={() => {
            sendAction({ type: "discard", cards: selected });
            setSelected([]);
          }}
        >
          <Text style={styles.actionButtonText}>
            {selected.length === 0
              ? "Selecciona al menos una carta"
              : `Descartar ${selected.length} carta(s)`}
          </Text>
        </Pressable>
      )}
      {view.phase === "discard" && iHaveDiscarded && (
        <Text style={styles.dim}>
          Esperando al resto: {view.awaitingDiscardFrom.join(", ") || "..."}
        </Text>
      )}

      {view.betting && (
        <View style={styles.bettingBox}>
          <Text style={styles.dim}>
            Turno de: {view.turnPlayer}{" "}
            {view.betting.pendingBet
              ? `· Envite pendiente: ${view.betting.pendingBet.amount} (equipo ${view.betting.pendingBet.team})`
              : "· sin envite"}
          </Text>
          {isMyTurnToBet && (
            <View style={styles.bettingActions}>
              {!respondingToOpponent && (
                <>
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => sendAction({ type: "pass" })}
                  >
                    <Text style={styles.smallButtonText}>Paso</Text>
                  </Pressable>
                  <TextInput
                    style={styles.betInput}
                    keyboardType="number-pad"
                    value={betAmount}
                    onChangeText={setBetAmount}
                  />
                  <Pressable
                    disabled={Boolean(view.betting?.pendingBet?.ordago)}
                    style={styles.smallButton}
                    onPress={() =>
                      sendAction({
                        type: "bet",
                        amount: Math.max(
                          Number(betAmount) || 2,
                          (view.betting?.pendingBet?.amount || 0) + 2,
                        ),
                      })
                    }
                  >
                    <Text style={styles.smallButtonText}>Envido</Text>
                  </Pressable>
                </>
              )}
              {respondingToOpponent && (
                <>
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => sendAction({ type: "accept" })}
                  >
                    <Text style={styles.smallButtonText}>Quiero</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => sendAction({ type: "reject" })}
                  >
                    <Text style={styles.smallButtonText}>No quiero</Text>
                  </Pressable>
                  <TextInput
                    style={styles.betInput}
                    keyboardType="number-pad"
                    value={betAmount}
                    onChangeText={setBetAmount}
                  />
                  <Pressable
                    disabled={Boolean(view.betting?.pendingBet?.ordago)}
                    style={styles.smallButton}
                    onPress={() =>
                      sendAction({
                        type: "bet",
                        amount: Math.max(
                          Number(betAmount) || 2,
                          (view.betting?.pendingBet?.amount || 0) + 2,
                        ),
                      })
                    }
                  >
                    <Text style={styles.smallButtonText}>Subir</Text>
                  </Pressable>
                </>
              )}
              <Pressable
                disabled={Boolean(view.betting?.pendingBet?.ordago)}
                style={[styles.smallButton, styles.ordago]}
                onPress={() => sendAction({ type: "ordago" })}
              >
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

// Los asientos públicos identifican la pareja; el motor valida cada acción.
function teamGuess(view: MusView, playerId: string | null): "A" | "B" | null {
  if (!playerId) return null;
  const seat = view.players.indexOf(playerId);
  if (seat < 0) return null;
  return seat % 2 === 0 ? "A" : "B";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.ink, padding: 16 },
  banner: {
    color: COLORS.black,
    backgroundColor: COLORS.citrus,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 12,
    padding: 10,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
    ...SHADOW,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.plum,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: 10,
  },
  score: { color: COLORS.paper, fontWeight: "900" },
  phase: {
    color: COLORS.cyan,
    marginTop: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  error: { color: COLORS.red, marginTop: 8, fontWeight: "800" },
  sectionTitle: {
    color: COLORS.citrus,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  dim: { color: COLORS.muted, marginTop: 4 },
  actionButton: {
    backgroundColor: COLORS.cyan,
    borderWidth: 3,
    borderColor: COLORS.black,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    ...SHADOW,
  },
  actionButtonText: { color: COLORS.black, fontWeight: "900" },
  bettingBox: {
    backgroundColor: COLORS.plum,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  bettingActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  smallButton: {
    backgroundColor: COLORS.cyan,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  ordago: { backgroundColor: COLORS.pink },
  smallButtonText: { color: COLORS.black, fontWeight: "900" },
  betInput: {
    backgroundColor: COLORS.paper,
    color: COLORS.black,
    width: 56,
    textAlign: "center",
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 10,
    paddingVertical: 6,
    fontWeight: "900",
  },
  log: {
    maxHeight: 120,
    marginTop: 5,
    backgroundColor: COLORS.plum,
    borderRadius: 10,
    padding: 8,
  },
  logLine: { color: COLORS.paper, fontSize: 12, lineHeight: 17 },
});
