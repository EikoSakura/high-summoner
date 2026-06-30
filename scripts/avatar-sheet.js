// scripts/avatar-sheet.js
// Make the custom `avatar` trait suppress the Attributes "EDIT" attention glow
// on the PF2e character sheet, mirroring how the system already suppresses it
// for `eidolon`/`minion` companions.
//
// How the glow works (traced in pf2e 7.12.2 / Foundry v13; no system files are
// edited here):
//   * The glow is the CSS class `has-unallocated` on the
//     `button[data-action="edit-attribute-boosts"]` button. The template writes
//     that class only `{{#unless attributeBoostsAllocated}}`
//     (systems/pf2e/templates/actors/character/tabs/character.hbs), and pf2e.css
//     animates `button.has-unallocated` with the `glow` keyframes.
//   * `CharacterSheetPF2e#getData` computes `attributeBoostsAllocated` and forces
//     it `true` (= "allocated", so NO glow) when
//     `build.attributes.manual || !isReallyPC(actor)`. Eidolons/minions hit the
//     `!isReallyPC` half via the system's HARDCODED ["eidolon","minion"] list —
//     which a module cannot extend by data, so our avatars still glow by default.
//
// This module's isReallyPC (utils.js) already excludes "avatar", so gating on
// `!isReallyPC(actor)` reproduces the system's own branch and folds avatars into
// it. (Eidolons/minions also satisfy it, but the system already suppresses them,
// so for those actors this is a harmless no-op.)
//
// PRIMARY (data-level, flicker-free): libWrapper-wrap getData and force the same
// flag the template reads, so the glow class is never rendered.
// FALLBACK (presentation-level): if the wrap cannot be registered, a render hook
// strips the class. Either way the change is module-only.

import { isReallyPC } from "./utils.js";

const MODULE_ID = "high-summoner";
// Registered sheet key contains a dot, so bracket notation is required — this is
// the form libWrapper documents as valid (README: character["dnd5e...."].cls...).
const GETDATA_TARGET =
  'CONFIG.Actor.sheetClasses.character["pf2e.CharacterSheetPF2e"].cls.prototype.getData';
const BOOST_BTN = 'button[data-action="edit-attribute-boosts"]';

/**
 * Should this actor's attribute-boost glow be suppressed? True for our avatars
 * (and any non-PC companion), matching the system's own `!isReallyPC` branch.
 * @param {Actor} actor
 * @returns {boolean}
 */
const suppressGlow = (actor) => !!actor && !isReallyPC(actor);

Hooks.once("setup", () => {
  let wrapped = false;

  // PRIMARY: force the sheet flag the template reads, exactly like the system's
  // eidolon/minion suppression. No DOM class is ever written, so no flicker.
  if (globalThis.libWrapper?.register) {
    try {
      libWrapper.register(
        MODULE_ID,
        GETDATA_TARGET,
        async function (wrappedGetData, ...args) {
          const data = await wrappedGetData(...args);
          // `this` is the CharacterSheetPF2e instance; this.actor is the PC doc.
          if (data && suppressGlow(this.actor)) data.attributeBoostsAllocated = true;
          return data;
        },
        "WRAPPER"
      );
      wrapped = true;
    } catch (err) {
      console.warn(
        `${MODULE_ID} | could not wrap CharacterSheetPF2e#getData; using render-hook fallback for avatar boost-glow suppression.`,
        err
      );
    }
  }

  // FALLBACK: strip the glow class on render. Idempotent and scoped to suppressed
  // actors, so when the libWrapper path already kept the class out of the DOM
  // this finds nothing and is a no-op.
  Hooks.on("renderCharacterSheetPF2e", (app, html) => {
    if (!suppressGlow(app?.actor)) return;
    const root = html?.[0] ?? html; // ApplicationV1 in v13 → html is jQuery
    if (!root?.querySelectorAll) return;
    for (const btn of root.querySelectorAll(`${BOOST_BTN}.has-unallocated`)) {
      btn.classList.remove("has-unallocated");
    }
  });

  if (!wrapped) {
    console.warn(
      `${MODULE_ID} | lib-wrapper unavailable — avatar boost-glow suppression running in render-hook fallback mode.`
    );
  }
});
