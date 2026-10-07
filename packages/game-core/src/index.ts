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

export * from "./games/boards";
export * from "./games/social-cards";
export * from "./games/tricks";
export * from "./games/melds";
export * from "./games/holdem";
import {dominoEngine,ocaEngine,checkersEngine} from "./games/boards";
import {burroEngine,mentirosoEngine,sieteEngine,escobaEngine} from "./games/social-cards";
import {trickEngines} from "./games/tricks";
import {meldEngines} from "./games/melds";
import {holdemEngine} from "./games/holdem";
for(const engine of [dominoEngine,ocaEngine,checkersEngine,burroEngine,mentirosoEngine,sieteEngine,escobaEngine,...trickEngines,...meldEngines,holdemEngine]) registerGame(engine);
