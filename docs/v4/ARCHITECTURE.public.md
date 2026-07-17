# QMF Architecture Guide (Public)

**Version:** 4.0  
**Audience:** External developers · AI agents · partners

---

## Overview

QMF (Quizzman Modular Framework) is a layered frontend runtime for composable web applications. It is **not** a React framework. UI libraries may connect through adapters.

---

## Layered Design

1. **Foundation** — tokens, utilities, project contract loader  
2. **Runtime** — event bus, state, DI, plugins, introspection  
3. **Component** — reusable imperative UI primitives  
4. **Module** — business features as plugins with manifests  

Each layer imports only lower layers.

---

## Project Contract

Every app has `qmf.schema.json` describing modules, event bus mode, and AI constraints. CLI, runtime, and agents share this contract.

---

## Modules

Modules declare metadata in `manifest.json`: dependencies, services, events, states, config schema, lifecycle hooks. Agents should read manifests before source.

---

## Events

Typed events include namespace, version, payload schema, producers, and consumers. Magic strings are forbidden in typed mode.

---

## Introspection

`QMF.inspect.*` exposes modules, events, services, state, plugins, config, and dependency graphs without source parsing.

---

## Adapters

React, Vue, and Svelte adapters are optional and live outside the core layers.

---

## Learn more

- Usage patterns: see repository docs `USAGE.md` (v3) and v4 examples  
- Migration: `MIGRATION_v3_v4.md`  
- AI rules: `AI_RULES.md`  
