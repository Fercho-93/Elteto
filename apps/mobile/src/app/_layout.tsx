import { Stack } from "expo-router";
import "react-native-get-random-values";
import { GameSessionProvider } from "../state/GameSession";

export default function RootLayout() {
  return (
    <GameSessionProvider>
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0f5132" }, headerTintColor: "#fff" }}>
        <Stack.Screen name="index" options={{ title: "Elteto" }} />
        <Stack.Screen name="host" options={{ title: "Crear partida" }} />
        <Stack.Screen name="join" options={{ title: "Unirse a partida" }} />
        <Stack.Screen name="lobby" options={{ title: "Sala de espera" }} />
        <Stack.Screen name="game" options={{ title: "Partida", headerBackVisible: false }} />
      </Stack>
    </GameSessionProvider>
  );
}
