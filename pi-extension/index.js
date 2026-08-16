import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MODE,
  RUNTIME_MODES,
  getDefaultMode,
  getQuietStartup,
  getHideStatus,
  normalizeMode,
  normalizePersistedMode,
  isDeactivationCommand,
  writeDefaultMode,
} = require("../hooks/sweep-config.js");
const { getSweepInstructions, filterSkillBodyForMode } = require("../hooks/sweep-instructions.js");

export { filterSkillBodyForMode };
export const readDefaultMode = getDefaultMode;
export const readQuietStartup = getQuietStartup;

const RUNTIME_MODE_LIST = RUNTIME_MODES.join("|");
const SWEEP_COMMAND_DESCRIPTION = `Set mode: ${RUNTIME_MODE_LIST}. Commands: status, default <mode>`;

export function resolveSessionMode(entries, fallbackMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(fallbackMode) || DEFAULT_MODE;
  if (!Array.isArray(entries)) return fallback;

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "custom" || entry?.customType !== "sweep-mode") continue;

    const mode = normalizePersistedMode(entry?.data?.mode);
    if (mode) return mode;
  }

  return fallback;
}

export function parseSweepCommand(text, defaultMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(defaultMode) || DEFAULT_MODE;
  const normalizedText = String(text || "").trim().toLowerCase();

  if (!normalizedText) {
    return { type: "set-mode", mode: fallback === "off" ? "full" : fallback };
  }

  const [primary, secondary] = normalizedText.split(/\s+/);

  if (primary === "status") return { type: "status" };

  if (primary === "default") {
    // sweep: a default must be a runtime level; review is session-only (#377).
    const mode = normalizeMode(secondary);
    return mode ? { type: "set-default", mode } : { type: "invalid", reason: "invalid-default-mode" };
  }

  const mode = normalizeMode(primary);
  return mode ? { type: "set-mode", mode } : { type: "invalid", reason: "invalid-mode", mode: primary };
}

export { writeDefaultMode };

export default function sweepExtension(pi) {
  // sweep: seed the live mode from the configured default, not the hardcoded
  // DEFAULT_MODE. before_agent_start can fire before (or without) session_start,
  // and a hardcoded 'full' there injected sweep even when the saved default was
  // 'off'. session_start still re-resolves against the session entries.
  let configuredDefaultMode = getDefaultMode();
  let currentMode = configuredDefaultMode;
  let hideStatus = getHideStatus();
  let lastCtx = null;

  // -- Status bar --
  function syncStatus(ctx) {
    if (ctx) lastCtx = ctx;
    const c = ctx || lastCtx;
    // sweep: hide the indicator but keep the ruleset active (#324).
    if (hideStatus) return;
    if (!c?.ui?.setStatus) return;
    // sweep: try/catch guards against pi-web theme proxy throwing before initTheme
    let theme;
    try { theme = c.ui.theme; if (!theme?.fg) return; } catch { return; }
    if (currentMode === "off") {
      c.ui.setStatus("sweep", "");
      return;
    }
    c.ui.setStatus("sweep", theme.fg("muted", "sweep: ") + theme.fg("text", currentMode));
  }

  const setMode = (mode, ctx) => {
    const normalized = normalizePersistedMode(mode);
    if (!normalized) return;

    const previousDefault = configuredDefaultMode;
    currentMode = normalized;
    pi.appendEntry("sweep-mode", { mode: normalized });

    // sweep: only the on/off switch is durable. Turning sweep off has to survive
    // a fresh pi launch (session entries are per-session and are not reloaded by
    // a new process), and so does turning it back on. But an intensity picked for
    // one task must not silently become the global default for every future
    // session in every project — /sweep default <level> is the explicit way to
    // do that. Env override (SWEEP_DEFAULT_MODE) still wins via getDefaultMode().
    const togglesActivation = normalized === "off" || previousDefault === "off";
    let persistenceError;
    let written = null;
    if (togglesActivation) {
      try {
        written = writeDefaultMode(normalized);
        if (written) configuredDefaultMode = getDefaultMode();
      } catch (e) {
        persistenceError = e;
      }
    }

    syncStatus(ctx);
    const ui = ctx?.ui || lastCtx?.ui;
    if (persistenceError) {
      ui?.notify?.(`Sweep mode set to ${normalized} for this session, but failed to persist: ${persistenceError.message}`, "warning");
    } else if (written) {
      ui?.notify?.(
        configuredDefaultMode === written
          ? `Sweep mode set to ${written}, saved for future sessions.`
          : `Sweep mode set to ${written}, but env override keeps the default at ${configuredDefaultMode}.`,
        "info",
      );
    } else {
      ui?.notify?.(`Sweep mode set to ${normalized} for this session (default stays ${configuredDefaultMode}).`, "info");
    }
  };

  const sendAlias = (skillName, args, ctx) => {
    const normalized = String(args || "").trim();
    const message = normalized ? `${skillName} ${normalized}` : skillName;

    if (ctx?.isIdle?.() === false) {
      pi.sendUserMessage(message, { deliverAs: "followUp" });
      ctx?.ui?.notify?.(`${skillName} queued as follow-up.`, "info");
      return;
    }

    pi.sendUserMessage(message);
  };

  pi.registerCommand("sweep", {
    description: SWEEP_COMMAND_DESCRIPTION,
    handler: async (args, ctx) => {
      const parsed = parseSweepCommand(args, configuredDefaultMode);

      if (parsed.type === "status") {
        ctx?.ui?.notify?.(`Sweep: current ${currentMode} • default ${configuredDefaultMode}`, "info");
        return;
      }

      if (parsed.type === "set-default") {
        try {
          const written = writeDefaultMode(parsed.mode);
          if (written) {
            configuredDefaultMode = getDefaultMode();
            const message = configuredDefaultMode === written
              ? `Default Sweep mode set to ${written}.`
              : `Saved default ${written}, but env override keeps default at ${configuredDefaultMode}.`;
            ctx?.ui?.notify?.(message, "info");
          }
        } catch (e) {
          ctx?.ui?.notify?.(`Failed to save default mode: ${e.message}`, "error");
        }
        return;
      }

      if (parsed.type === "set-mode") {
        setMode(parsed.mode, ctx);
        return;
      }

      ctx?.ui?.notify?.("Unknown or unsupported /sweep mode.", "warning");
    },
  });

  pi.registerCommand("sweep-review", {
    description: "Run /skill:sweep-review",
    handler: (_args, ctx) => sendAlias("/skill:sweep-review", "", ctx),
  });

  pi.registerCommand("sweep-audit", {
    description: "Run /skill:sweep-audit",
    handler: (_args, ctx) => sendAlias("/skill:sweep-audit", "", ctx),
  });

  pi.registerCommand("sweep-gain", {
    description: "Run /skill:sweep-gain",
    handler: (_args, ctx) => sendAlias("/skill:sweep-gain", "", ctx),
  });

  pi.registerCommand("sweep-debt", {
    description: "Run /skill:sweep-debt",
    handler: (_args, ctx) => sendAlias("/skill:sweep-debt", "", ctx),
  });

  pi.registerCommand("sweep-help", {
    description: "Run /skill:sweep-help",
    handler: (_args, ctx) => sendAlias("/skill:sweep-help", "", ctx),
  });

  pi.on("input", async (event) => {
    if (event?.source === "extension") return;

    const text = String(event?.text || "");
    if (currentMode !== "off" && isDeactivationCommand(text)) {
      setMode("off");
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    configuredDefaultMode = getDefaultMode();
    hideStatus = getHideStatus();
    currentMode = resolveSessionMode(entries, configuredDefaultMode);
    syncStatus(ctx);
    // sweep: an off sweep announces nothing — "Sweep loaded: off" is a toast
    // about a tool that is not running. SWEEP_QUIET_STARTUP / config.quietStartup
    // still silences the notice for the active levels too.
    if (currentMode !== "off" && !getQuietStartup()) {
      ctx?.ui?.notify?.(`Sweep loaded: ${currentMode}`, "info");
    }
  });

  pi.on("agent_start", async (_event, ctx) => {
    syncStatus(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    syncStatus(ctx);
  });

  pi.on("before_agent_start", async (event) => {
    if (!currentMode || currentMode === "off") return;
    // Guard a null/undefined event or a missing systemPrompt: don't crash, and
    // don't prepend the literal string "undefined" to the prompt (#439, #440).
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : "";
    return { systemPrompt: `${base}${getSweepInstructions(currentMode)}` };
  });
}
