import { useCallback, useEffect } from "react";
import { Alert, BackHandler } from "react-native";
import { useRouter } from "expo-router";

// En la sala y en la partida, "volver" significa dejar la mesa: el botón visible y el
// gesto o botón atrás de Android piden confirmación. En iOS el deslizamiento está
// desactivado en estas pantallas (ver _layout.tsx) para no salir sin querer.
export function useLeaveGuard(leave: () => void, title: string) {
  const router = useRouter();
  const confirmLeave = useCallback(() => {
    Alert.alert(title, "Dejarás tu sitio en la mesa.", [
      { text: "Quedarme", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => { leave(); router.replace("/"); } },
    ]);
  }, [leave, router, title]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { confirmLeave(); return true; });
    return () => subscription.remove();
  }, [confirmLeave]);
  return confirmLeave;
}
