import { Stack } from "expo-router";
import "react-native-get-random-values";
import { COLORS } from "../theme";
import { GameSessionProvider } from "../state/GameSession";

export default function RootLayout() {
  return (
    <GameSessionProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.plum },
          headerTintColor: COLORS.paper,
          headerTitleStyle: { fontWeight: "900" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.ink },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Elteto", headerShown: false }} />
        <Stack.Screen name="host" options={{ title: "Prepara la mesa" }} />
        <Stack.Screen name="join" options={{ title: "Busca tu mesa" }} />
        <Stack.Screen name="lobby" options={{ title: "Que empiece el pique" }} />
        <Stack.Screen name="game" options={{ title: "Partida", headerShown: false, headerBackVisible: false }} />
      </Stack>
    </GameSessionProvider>
  );
}
