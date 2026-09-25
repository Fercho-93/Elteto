export * from "./deck";
export * from "./engine";
export * from "./games/mus";
export * from "./games/cinquillo";

import { registerGame } from "./engine";
import { musEngine } from "./games/mus";
import { cinquilloEngine } from "./games/cinquillo";

registerGame(musEngine);
registerGame(cinquilloEngine);
