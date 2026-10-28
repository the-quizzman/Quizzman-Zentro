# Legatus regression tests

From this directory, run `npm install` and `npm test`. Tests use an isolated DOM and mock HTTP; no account or live service is required. They cover cursor navigation, filters, bell/hub/mobile state, chronological Previous/Next controls, escaping, read deduplication and cancellation while WebSocket authentication is pending.
