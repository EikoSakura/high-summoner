# High Summoner

A PF2e (Foundry VTT v13) module that adds the **High Summoner** class archetype, its
avatar (eidolon-style companion), associated spells, and the custom `avatar` trait.

## Optional integrations

### PF2e Dailies — Egi Companion familiar abilities

`pf2e-dailies` is a **soft / optional** dependency (listed under
`relationships.recommends` in `module.json`, with no pinned version). If it is not
installed or not active, the rest of the module works unchanged.

When **PF2e Dailies** *is* active, an avatar designated an **Egi Companion** (i.e.
carrying the `egi-companion` marker item) gains an extra entry during **daily
preparations**: two "Familiar Ability" dropdowns that let it pick familiar abilities
from the system compendium (`pf2e.familiar-abilities`). The same ability cannot be
chosen in both dropdowns.

- The chosen abilities are embedded onto the avatar's **own** character sheet for the
  day and added to the daily-prep chat summary.
- On rest, they are removed, so each day re-prepares cleanly with no duplicates.
- Avatars without the Egi marker see no extra rows.

This is implemented in [`scripts/egi-dailies.js`](scripts/egi-dailies.js) and registered
via the Dailies public API (`game.modules.get("pf2e-dailies").api.registerCustomDailies`)
on Foundry's `ready` hook. It works on Foundry v13 (Dailies 4.16.x) and v14+
(Dailies 4.17+).

A console line — `high-summoner | egi-dailies | registered familiar-ability daily` —
confirms successful registration.
