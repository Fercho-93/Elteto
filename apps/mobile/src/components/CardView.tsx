import { Pressable, Text, View, StyleSheet } from "react-native";
import type { Card } from "game-core";

const SUIT_SYMBOL: Record<string, string> = {
  oros: "🟡",
  copas: "🍷",
  espadas: "⚔️",
  bastos: "🌿",
  picas: "♠",
  corazones: "♥",
  diamantes: "♦",
  treboles: "♣",
};

export function CardView({
  card,
  selected,
  onPress,
  disabled,
}: {
  card: Card;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <View style={[styles.card, selected && styles.cardSelected, disabled && styles.cardDisabled]}>
      <Text style={styles.rank}>{card.rank}</Text>
      <Text style={styles.suit}>{SUIT_SYMBOL[card.suit] ?? card.suit}</Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 52,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "#e2e2e2",
  },
  cardSelected: { borderColor: "#1f8a4c", transform: [{ translateY: -8 }] },
  cardDisabled: { opacity: 0.4 },
  rank: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  suit: { fontSize: 16 },
});
