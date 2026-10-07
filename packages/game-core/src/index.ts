export * from "./deck";
export * from "./engine";
export * from "./games/mus";
export * from "./games/cinquillo";
export * from "./games/parchis";

import { registerGame } from "./engine";
import { musEngine } from "./games/mus";
import { cinquilloEngine } from "./games/cinquillo";
import { parchisEngine } from "./games/parchis";

registerGame(musEngine);
registerGame(cinquilloEngine);
registerGame(parchisEngine);

export * from "./catalog";
