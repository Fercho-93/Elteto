import { useState } from "react";
import { COLORS, SHADOW } from "../theme";
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useGameSession } from "../state/GameSession";

function isValidIPv4(value: string) {
  const octets = value.trim().split(".");
  return octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255);
}

export default function JoinScreen() {
  const router = useRouter();
  const { joinRoom } = useGameSession();
  const [playerName, setPlayerName] = useState("");
  const [hostAddress, setHostAddress] = useState("");

  const canJoin = playerName.trim().length > 0 && isValidIPv4(hostAddress);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>IP del anfitrión</Text>
      <Text style={styles.hint}>Pídesela a quien haya creado la sala. Debéis estar en la misma Wi-Fi o hotspot.</Text>
      <TextInput
        style={styles.input}
        placeholder="p. ej. 192.168.1.23"
        placeholderTextColor="#8E7B88"
        value={hostAddress}
        onChangeText={setHostAddress}
        keyboardType="decimal-pad"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Tu nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="p. ej. Donde las dan, las toman"
        placeholderTextColor="#8E7B88"
        value={playerName}
        onChangeText={setPlayerName}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      <Pressable
        disabled={!canJoin}
        style={[styles.button, !canJoin && styles.buttonDisabled]}
        onPress={() => {
          joinRoom(hostAddress.trim(), playerName.trim());
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
  hint: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  input: { backgroundColor: COLORS.paper, color: COLORS.black, borderWidth: 3, borderColor: COLORS.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontWeight: "700", ...SHADOW },
  button: { backgroundColor: COLORS.pink, paddingVertical: 17, paddingHorizontal: 14, borderWidth: 3, borderColor: COLORS.black, borderRadius: 14, alignItems: "center", marginTop: 28, ...SHADOW },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: "900" },
});
