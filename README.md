# Fluent Safe UI App

React + TypeScript + Vite frontend for Safe on Fluent chains.

Supported Safe versions:
- v1.5.0
- v1.4.1

Defaults:
- Network: Fluent Mainnet (chainId 25363)
- Safe version: v1.5.0

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Transaction template JSON

Use this format in **"Build transaction package from JSON"**:

```json
{
  "safeAddress": "0xYourSafe",
  "transactions": [
    {
      "to": "0xTarget",
      "value": "0",
      "data": "0x",
      "operation": 0
    }
  ],
  "options": {
    "nonce": 12,
    "safeTxGas": "0",
    "baseGas": "0",
    "gasPrice": "0",
    "gasToken": "0x0000000000000000000000000000000000000000",
    "refundReceiver": "0x0000000000000000000000000000000000000000"
  }
}
```

You can also provide a full `safeTransactionData` object directly.

## Signature / bundle JSON accepted for import

Required fields:
- `safeAddress`
- `safeTransactionData` (or `safeTransaction.safeTransactionData`)

Optional but recommended:
- `safeTxHash` (required if signer must be recovered from signature)

Supported signature formats:

1. Safe bundle style:
```json
{ "signer": "0xOwner", "data": "0x<65-byte-signature>" }
```

2. Forge `r/s/v` style:
```json
{ "r": "0x...", "s": "0x...", "v": 27, "signer": "0xOwner" }
```

3. Forge/simple hex style:
```json
{ "signature": "0x<65-byte-signature>", "signer": "0xOwner" }
```

4. Signer -> signature map:
```json
{ "0xOwner": "0x<65-byte-signature>" }
```

5. Safe-service-like confirmations:
```json
{ "owner": "0xOwner", "signature": "0x<65-byte-signature>" }
```

If `signer` is missing, the app attempts signer recovery from `safeTxHash + signature`.
