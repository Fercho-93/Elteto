import { Pressable, Text, View, StyleSheet } from "react-native";
import { COLORS, SHADOW } from "../theme";
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
    width: 64, height: 90, borderRadius: 12, backgroundColor: COLORS.paper,
    alignItems: "center", justifyContent: "center", marginRight: 10,
    borderWidth: 3, borderColor: COLORS.black, ...SHADOW,
  },
  cardSelected: { borderColor: COLORS.pink, backgroundColor: COLORS.citrus, transform: [{ translateY: -9 }, { rotate: "-2deg" }] },
  cardDisabled: { opacity: 0.48 },
  rank: { fontSize: 22, fontWeight: "900", color: COLORS.black },
  suit: { fontSize: 20 },
});
