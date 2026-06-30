// scripts/egi-dailies.js
// Registers a PF2e Dailies custom daily that lets an "Egi Companion" avatar
// pick its familiar abilities during daily preparations. The chosen abilities
// are embedded onto the avatar's OWN standard character sheet (they appear in
// the Actions tab) and removed on rest, so they re-prepare cleanly each day.
//
// This does NOT use a familiar actor and does not turn the sheet into a
// familiar — it just drops the chosen `action` items onto the character. Since
// the avatar IS the summoned creature, any rule elements on those abilities
// (e.g. Flier's fly speed) correctly apply to the avatar.
//
// pf2e-dailies is a SOFT dependency: if it is not active, this file no-ops.
// Compatible with Foundry v13 (Dailies 4.16.x) and v14+ (Dailies 4.17+).

const DAILY_KEY = "egi-familiar-abilities";
const FAMILIAR_PACK = "pf2e.familiar-abilities"; // pf2e system compendium; all entries are action items
const EGI_MARKER_SLUG = "egi-companion";          // slug of the "Egi Companion (Avatar)" feat — the marker
const ABILITY_COUNT = 2;                           // Egi Companion grants two familiar abilities
const MODULE_ID = "high-summoner";                 // this module's id (temp-flag namespace)
const LOG = "high-summoner | egi-dailies |";

// Flip to false once it's working. While true, the console explains, on every
// daily-prep open, whether the actor matched and how many abilities were listed.
const DEBUG = true;

const isEgi = (actor) => actor?.items?.some((i) => i.slug === EGI_MARKER_SLUG) ?? false;

const egiFamiliarDaily = {
  key: DAILY_KEY,

  // Section header shown above the dropdowns in the prep window. Dailies runs
  // this through game.i18n.localize(); a plain (non-key) string passes through
  // unchanged. Without it, Dailies falls back to the raw "module.<key>" string.
  label: "Egi Companion",

  // Daily prep runs on the avatar's own character sheet. Fire only when this
  // actor is an Egi (carries the manually-added "Egi Companion (Avatar)" feat).
  condition: (actor) => {
    const ok = isEgi(actor);
    if (DEBUG) console.log(`${LOG} condition "${actor?.name}" (${actor?.type}): egi-marker=${ok}`);
    return ok;
  },

  // One "select a familiar ability" dropdown per granted ability.
  // NOTE: if this returns an empty array, Dailies hides the daily and shows
  // "This character doesn't have any daily" — so we guard and log loudly.
  rows: async () => {
    const pack = game.packs.get(FAMILIAR_PACK);
    if (!pack) {
      console.warn(`${LOG} pack "${FAMILIAR_PACK}" not found — is the pf2e system loaded?`);
      return [];
    }

    try {
      // getIndex() guarantees the index is loaded; entries expose uuid + name.
      const index = await pack.getIndex();
      const options = index
        .map((e) => ({ value: e.uuid, label: e.name }))
        .filter((o) => o.value && o.label)
        .sort((a, b) => a.label.localeCompare(b.label));

      if (DEBUG) console.log(`${LOG} rows(): ${options.length} familiar abilities available`);
      if (!options.length) console.warn(`${LOG} no abilities found in "${FAMILIAR_PACK}"`);

      const unique = foundry.utils.randomID(); // shared => same ability can't be chosen in two dropdowns

      return Array.from({ length: ABILITY_COUNT }, (_, i) => ({
        type: "select",
        slug: `ability${i + 1}`,
        label: `Familiar Ability ${i + 1}`,
        unique,
        order: 100,
        options,
      }));
    } catch (err) {
      console.error(`${LOG} rows() failed`, err);
      return [];
    }
  },

  // Embed the chosen abilities onto the avatar, tagged temporary for cleanup.
  // `rows` here is an object mapping each row slug to its selected ability uuid.
  process: async ({ actor, rows, messages }) => {
    const sources = [];
    for (const value of Object.values(rows)) {
      if (typeof value !== "string") continue;
      const item = await fromUuid(value);
      if (!item?.isOfType?.("action")) continue;
      const source = item.toObject();
      foundry.utils.setProperty(source, `flags.${MODULE_ID}.temporary`, true);
      sources.push(source);
      messages.add("familiar", { uuid: item }); // adds it to the daily-prep chat summary
    }
    if (sources.length) await actor.createEmbeddedDocuments("Item", sources);
    if (DEBUG) console.log(`${LOG} embedded ${sources.length} familiar abilities on "${actor?.name}"`);
  },

  // Remove temporary abilities so they don't accumulate across days.
  rest: async ({ actor }) => {
    const ids = actor.itemTypes.action
      .filter((i) => foundry.utils.getProperty(i, `flags.${MODULE_ID}.temporary`))
      .map((i) => i.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
    if (DEBUG && ids.length) console.log(`${LOG} removed ${ids.length} temporary abilities on rest`);
  },
};

// pf2e-dailies (4.16.x / Foundry v13) exposes its API at game.dailies.api —
// NOT game.modules.get("pf2e-dailies").api (which is undefined). We check both
// so the same code keeps working if another version surfaces it on the module.
const getDailiesApi = () =>
  globalThis.game?.dailies?.api ?? game.modules.get("pf2e-dailies")?.api ?? null;

Hooks.once("ready", () => {
  if (!game.modules.get("pf2e-dailies")?.active) return; // soft dependency
  const api = getDailiesApi();
  if (typeof api?.registerCustomDailies !== "function") {
    console.warn(`${LOG} pf2e-dailies API not found (game.dailies.api / module.api both empty) — daily NOT registered`);
    return;
  }
  api.registerCustomDailies([egiFamiliarDaily]);
  console.log(`${LOG} registered familiar-ability daily`);
});
