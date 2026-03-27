# Fluent Safe UI App

React + TypeScript + Vite frontend for Safe v1.4.1 on Fluent chains.

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
