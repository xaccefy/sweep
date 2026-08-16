import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import sweepExtension from "../index.js";

function createPiHarness() {
  const events = new Map();
  const commands = new Map();
  const appendedEntries = [];
  const sentUserMessages = [];

  const pi = {
    on(eventName, handler) {
      events.set(eventName, handler);
    },
    registerCommand(name, options) {
      commands.set(name, options);
    },
    appendEntry(customType, data) {
      appendedEntries.push({ customType, data });
    },
    sendUserMessage(text, options) {
      sentUserMessages.push({ text, options });
    },
  };

  sweepExtension(pi);
  return { events, commands, appendedEntries, sentUserMessages };
}

function createCommandContext(overrides = {}) {
  return {
    isIdle: () => true,
    sessionManager: { getEntries: () => [] },
    ui: { notify() {} },
    ...overrides,
  };
}

function withTempConfig(fn) {
  const tempConfigHome = mkdtempSync(join(tmpdir(), "sweep-test-"));
  const previousXdg = process.env.XDG_CONFIG_HOME;
  const previousDefault = process.env.SWEEP_DEFAULT_MODE;
  const previousHide = process.env.SWEEP_HIDE_STATUS;
  process.env.XDG_CONFIG_HOME = tempConfigHome;
  delete process.env.SWEEP_DEFAULT_MODE;
  delete process.env.SWEEP_HIDE_STATUS;

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = previousXdg;
      if (previousDefault === undefined) delete process.env.SWEEP_DEFAULT_MODE;
      else process.env.SWEEP_DEFAULT_MODE = previousDefault;
      if (previousHide === undefined) delete process.env.SWEEP_HIDE_STATUS;
      else process.env.SWEEP_HIDE_STATUS = previousHide;
      rmSync(tempConfigHome, { recursive: true, force: true });
    });
}

test("extension registers Sweep commands", () => {
  const { commands } = createPiHarness();

  assert.deepEqual([...commands.keys()].sort(), ["sweep", "sweep-audit", "sweep-debt", "sweep-gain", "sweep-help", "sweep-review"]);
});

test("/sweep updates session mode and injects instructions", async () => withTempConfig(async () => {
  const { commands, events, appendedEntries } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("ultra", ctx);

  assert.deepEqual(appendedEntries.at(-1), {
    customType: "sweep-mode",
    data: { mode: "ultra" },
  });
  // An intensity picked for one task stays in that session: it must not become
  // the saved default for every future session in every other project.
  assert.equal(existsSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json")), false);

  const result = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.ok(result.systemPrompt.includes("SWEEP MODE ACTIVE"));
  assert.ok(result.systemPrompt.includes("ultra"));
}));

test("/sweep status keeps the saved default while the session mode changes", async () => withTempConfig(async () => {
  const notices = [];
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext({ ui: { notify: (message, level) => notices.push({ message, level }) } });

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("ultra", ctx);
  await commands.get("sweep").handler("status", ctx);

  assert.deepEqual(notices.at(-1), {
    message: "Sweep: current ultra • default full",
    level: "info",
  });
}));

test("/sweep off persists so a fresh launch stays off", async () => withTempConfig(async () => {
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("off", ctx);

  assert.deepEqual(
    JSON.parse(readFileSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json"), "utf8")),
    { defaultMode: "off" },
  );
  assert.equal(await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx), undefined);
}));

test("turning sweep back on from off persists the level", async () => withTempConfig(async () => {
  mkdirSync(join(process.env.XDG_CONFIG_HOME, "sweep"), { recursive: true });
  writeFileSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json"), JSON.stringify({ defaultMode: "off" }));
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("lite", ctx);

  assert.deepEqual(
    JSON.parse(readFileSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json"), "utf8")),
    { defaultMode: "lite" },
  );
}));

test("\"stop sweep\" persists off", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await events.get("input")({ text: "stop sweep" });

  assert.deepEqual(
    JSON.parse(readFileSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json"), "utf8")),
    { defaultMode: "off" },
  );
}));

test("/sweep keeps the session mode when durable persistence fails", async () => withTempConfig(async () => {
  const blockedConfigHome = join(process.env.XDG_CONFIG_HOME, "not-a-directory");
  writeFileSync(blockedConfigHome, "", "utf8");
  process.env.XDG_CONFIG_HOME = blockedConfigHome;
  // Saved default off, so turning sweep back on is the durable half of the
  // switch — the path that writes, and here the write cannot succeed.
  process.env.SWEEP_DEFAULT_MODE = "off";

  const notices = [];
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext({ ui: { notify: (message, level) => notices.push({ message, level }) } });

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("lite", ctx);

  const injected = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.match(injected.systemPrompt, /SWEEP MODE ACTIVE — level: lite/);
  assert.equal(notices.at(-1).level, "warning");
  assert.match(notices.at(-1).message, /set to lite for this session, but failed to persist/);
}));

test("before_agent_start guards missing event and missing systemPrompt (#439, #440)", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const ctx = createCommandContext();
  await events.get("session_start")({ reason: "startup" }, ctx); // currentMode -> default (full)

  // #439: a null/undefined event must not crash, and still injects the ruleset.
  for (const bad of [undefined, null]) {
    const r = await events.get("before_agent_start")(bad, ctx);
    assert.ok(r.systemPrompt.includes("SWEEP MODE ACTIVE"));
    assert.ok(!r.systemPrompt.includes("undefined"), "must not contain the literal 'undefined'");
  }

  // #440: an event without a systemPrompt must not prepend the literal "undefined".
  const empty = await events.get("before_agent_start")({}, ctx);
  assert.ok(empty.systemPrompt.includes("SWEEP MODE ACTIVE"));
  assert.ok(!empty.systemPrompt.startsWith("undefined"), "must not start with 'undefined'");

  // A real base prompt is still preserved and prepended.
  const withBase = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.ok(withBase.systemPrompt.startsWith("BASE\n\n"));
  assert.ok(withBase.systemPrompt.includes("SWEEP MODE ACTIVE"));
}));

test("session_start restores latest persisted mode", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const ctx = createCommandContext({
    sessionManager: {
      getEntries: () => [
        { type: "custom", customType: "sweep-mode", data: { mode: "lite" } },
      ],
    },
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  const result = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);

  assert.ok(result.systemPrompt.includes("lite"));
}));

test("skill alias commands delegate to Pi skill commands", async () => {
  const { commands, sentUserMessages } = createPiHarness();
  const ctx = createCommandContext();

  await commands.get("sweep-review").handler("", ctx);
  await commands.get("sweep-audit").handler("", ctx);
  await commands.get("sweep-debt").handler("", ctx);
  await commands.get("sweep-gain").handler("", ctx);
  await commands.get("sweep-help").handler("", ctx);

  assert.deepEqual(sentUserMessages.map((entry) => entry.text), [
    "/skill:sweep-review",
    "/skill:sweep-audit",
    "/skill:sweep-debt",
    "/skill:sweep-gain",
    "/skill:sweep-help",
  ]);
});

test("normal mode disables persistent instructions", async () => withTempConfig(async () => {
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("ultra", ctx);
  await events.get("input")({ text: "normal mode", source: "interactive" }, ctx);

  const disabled = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.equal(disabled, undefined);
}));

test("a request mentioning normal mode stays active", async () => withTempConfig(async () => {
  const { commands, events } = createPiHarness();
  const ctx = createCommandContext();

  await events.get("session_start")({ reason: "startup" }, ctx);
  await commands.get("sweep").handler("ultra", ctx);
  await events.get("input")({ text: "add a normal mode toggle next to dark mode", source: "interactive" }, ctx);

  const result = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);
  assert.match(result.systemPrompt, /SWEEP MODE ACTIVE/);
}));

test("status bar renders the mode on session and agent start", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const statusWrites = [];
  const ctx = createCommandContext({
    sessionManager: { getEntries: () => [{ type: "custom", customType: "sweep-mode", data: { mode: "ultra" } }] },
    ui: { notify() {}, setStatus: (key, text) => statusWrites.push({ key, text }), theme: { fg: (_color, text) => text } },
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  await events.get("agent_start")({}, ctx);

  assert.equal(statusWrites.at(-2).key, "sweep");
  assert.match(statusWrites.at(-2).text, /sweep: ultra/);
  assert.match(statusWrites.at(-1).text, /sweep: ultra/);
}));

test("status bar stays silent when ui lacks a theme", async () => withTempConfig(async () => {
  const { events } = createPiHarness();
  const calls = [];
  const ctx = createCommandContext({
    sessionManager: { getEntries: () => [{ type: "custom", customType: "sweep-mode", data: { mode: "ultra" } }] },
    ui: { notify() {}, setStatus: (_key, text) => calls.push(text) }, // setStatus present, theme absent
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  await events.get("agent_start")({}, ctx);

  assert.deepEqual(calls, []);
}));

test("SWEEP_HIDE_STATUS hides the indicator but keeps sweep active (#324)", async () => withTempConfig(async () => {
  process.env.SWEEP_HIDE_STATUS = "1";
  const { events } = createPiHarness();
  const statusWrites = [];
  const ctx = createCommandContext({
    sessionManager: { getEntries: () => [{ type: "custom", customType: "sweep-mode", data: { mode: "ultra" } }] },
    ui: { notify() {}, setStatus: (key, text) => statusWrites.push({ key, text }), theme: { fg: (_c, t) => t } },
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  await events.get("agent_start")({}, ctx);
  const injected = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);

  assert.deepEqual(statusWrites, [], "status bar must not be drawn when hidden");
  assert.match(injected.systemPrompt, /SWEEP MODE ACTIVE/, "ruleset must still inject while status is hidden");
}));

test("config.hideStatus hides the indicator but keeps sweep active (#324)", async () => withTempConfig(async () => {
  mkdirSync(join(process.env.XDG_CONFIG_HOME, "sweep"), { recursive: true });
  writeFileSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json"), JSON.stringify({ hideStatus: true }));
  const { events } = createPiHarness();
  const statusWrites = [];
  const ctx = createCommandContext({
    ui: { notify() {}, setStatus: (key, text) => statusWrites.push({ key, text }), theme: { fg: (_c, t) => t } },
  });

  await events.get("session_start")({ reason: "startup" }, ctx);
  await events.get("agent_start")({}, ctx);
  const injected = await events.get("before_agent_start")({ systemPrompt: "BASE" }, ctx);

  assert.deepEqual(statusWrites, [], "config.hideStatus must suppress the status bar");
  assert.match(injected.systemPrompt, /SWEEP MODE ACTIVE/, "ruleset must still inject while status is hidden");
}));

test("SWEEP_HIDE_STATUS=0 does not hide the indicator", async () => withTempConfig(async () => {
  process.env.SWEEP_HIDE_STATUS = "0";
  const { events } = createPiHarness();
  const statusWrites = [];
  const ctx = createCommandContext({
    sessionManager: { getEntries: () => [{ type: "custom", customType: "sweep-mode", data: { mode: "ultra" } }] },
    ui: { notify() {}, setStatus: (key, text) => statusWrites.push({ key, text }), theme: { fg: (_c, t) => t } },
  });

  await events.get("session_start")({ reason: "resume" }, ctx);
  await events.get("agent_start")({}, ctx);

  assert.ok(statusWrites.length > 0, "0 must be treated as 'do not hide'");
}));

test("saved defaultMode off is honored before session_start fires", async () => withTempConfig(async () => {
  mkdirSync(join(process.env.XDG_CONFIG_HOME, "sweep"), { recursive: true });
  writeFileSync(join(process.env.XDG_CONFIG_HOME, "sweep", "config.json"), JSON.stringify({ defaultMode: "off" }));
  const { events } = createPiHarness();

  // before_agent_start can fire before (or without) session_start; the saved
  // default must already be in effect instead of a hardcoded 'full'.
  const injected = await events.get("before_agent_start")({ systemPrompt: "BASE" });

  assert.equal(injected, undefined, "sweep must not inject while the saved default is off");
}));
