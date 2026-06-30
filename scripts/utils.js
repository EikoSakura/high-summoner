// scripts/utils.js
// Shared helper utilities for the High Summoner module.
//
// Reachable two ways:
//   • ES import  — `import { isReallyPC } from "./utils.js";` (other module scripts)
//   • Module API — `game.modules.get("high-summoner").api.isReallyPC(actor)`
//     (macros, inline rolls, the F12 console, other modules)

const MODULE_ID = "high-summoner";

/**
 * True only for an actual player character — NOT a companion creature that
 * shares the `character` actor type. In PF2e the Summoner's eidolon is a
 * `character`-type actor carrying the `eidolon`/`minion` traits, so a naive
 * `isOfType("character")` check would wrongly include it; this filters it out.
 *
 * This module's summoned creatures carry the custom `avatar` trait, so it is
 * included in the exclusion list — an avatar is a companion, not a real PC.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isReallyPC(actor) {
  const traits = actor.system.traits?.value ?? [];
  return actor.isOfType("character") && !["eidolon", "minion", "avatar"].some((t) => traits.includes(t));
}

// Publish on the module API at init so macros/console/other modules can use it
// without importing. Merge rather than overwrite in case another script also
// contributes to the API object.
Hooks.once("init", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { ...(module.api ?? {}), isReallyPC };
});
