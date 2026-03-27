# Fluent Safe UI (Gnosis Safe v1.4.1)

Frontend-only React app for managing Safe transactions on Fluent networks.

- no backend
- file-based signature exchange
- Safe contracts pinned to v1.4.1 addresses

## Location

The web app lives in [`app/`](./app).

## Implemented flows

1. Connect wallet and switch between:
   - Fluent Testnet (`20994`)
   - Fluent Mainnet (`25363`)
2. Create/deploy a new Safe (owners, threshold, salt nonce).
3. Build a Safe transaction from JSON template and export a bundle (`.json`) for other signers.
4. Load bundle, sign it, re-export updated bundle.
5. Execute transaction once threshold signatures are collected.

## Quick start

```bash
cd app
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Notes

- The app uses `@safe-global/protocol-kit` (Safe SDK).
- Signatures are collected off-chain by sharing JSON bundles.
- No Safe Transaction Service backend is required for this flow.
