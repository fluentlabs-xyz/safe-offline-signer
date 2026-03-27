import { useMemo, useState } from 'react'
import './App.css'
import Safe, { EthSafeSignature, EthSafeTransaction } from '@safe-global/protocol-kit'
import type { SafeTransactionData, SafeVersion } from '@safe-global/types-kit'
import { OperationType } from '@safe-global/types-kit'
import { BrowserProvider } from 'ethers'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

type NetworkKey = 'mainnet' | 'testnet'

type NetworkConfig = {
  key: NetworkKey
  name: string
  chainId: number
  rpcUrl: string
  explorerUrl: string
}

type SignatureJson = {
  signer: string
  data: string
  isContractSignature?: boolean
}

type SafeTxBundle = {
  version: '1.0'
  safeVersion: SafeVersion
  chainId: number
  network: string
  safeAddress: string
  safeTxHash: string
  safeTransactionData: SafeTransactionData
  signatures: SignatureJson[]
  createdAt: string
}

type TxTemplateJson = {
  safeAddress?: string
  transactions?: Array<{
    to: string
    value?: string | number
    data?: string
    operation?: 0 | 1
  }>
  options?: {
    safeTxGas?: string | number
    baseGas?: string | number
    gasPrice?: string | number
    gasToken?: string
    refundReceiver?: string
    nonce?: number
  }
  safeTransactionData?: SafeTransactionData
}

const SAFE_CONTRACTS_V141 = {
  compatibilityFallbackHandler: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99',
  createCall: '0x9b35Af71d77eaf8d7e40252370304687390A1A52',
  multiSendCallOnly: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
  multiSend: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
  safeL2: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
  safeMigration: '0x526643F69b81B008F46d95CD5ced5eC0edFFDaC6',
  safeProxyFactory: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
  safeToL2Migration: '0xfF83F6335d8930cBad1c0D439A841f01888D9f69',
  safeToL2Setup: '0xBD89A1CE4DDe368FFAB0eC35506eEcE0b1fFdc54',
  safe: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
  signMessageLib: '0xd53cd0aB83D845Ac265BE939c57F53AD838012c9',
  simulateTxAccessor: '0x3d4BA2E0884aa488718476ca2FB8Efc291A46199',
} as const

const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  mainnet: {
    key: 'mainnet',
    name: 'Fluent Mainnet',
    chainId: 25363,
    rpcUrl: 'https://rpc.fluent.xyz',
    explorerUrl: 'https://fluentscan.xyz',
  },
  testnet: {
    key: 'testnet',
    name: 'Fluent Testnet',
    chainId: 20994,
    rpcUrl: 'https://rpc.testnet.fluent.xyz',
    explorerUrl: 'https://testnet.fluentscan.xyz',
  },
}

const V141: SafeVersion = '1.4.1'

function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`
}

function getEthereum(): EthereumProvider | null {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null
}

function truncate(address?: string): string {
  if (!address) return '-'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function asString(v: string | number | undefined, fallback: string): string {
  if (v === undefined || v === null || v === '') return fallback
  return String(v)
}

function parseOwners(raw: string): string[] {
  return raw
    .split(/[,\n\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
}

function buildContractNetworks(chainId: number) {
  return {
    [String(chainId)]: {
      safeSingletonAddress: SAFE_CONTRACTS_V141.safeL2,
      safeProxyFactoryAddress: SAFE_CONTRACTS_V141.safeProxyFactory,
      multiSendAddress: SAFE_CONTRACTS_V141.multiSend,
      multiSendCallOnlyAddress: SAFE_CONTRACTS_V141.multiSendCallOnly,
      fallbackHandlerAddress: SAFE_CONTRACTS_V141.compatibilityFallbackHandler,
      signMessageLibAddress: SAFE_CONTRACTS_V141.signMessageLib,
      createCallAddress: SAFE_CONTRACTS_V141.createCall,
      simulateTxAccessorAddress: SAFE_CONTRACTS_V141.simulateTxAccessor,
    },
  }
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function readJsonFile<T>(file: File): Promise<T> {
  const text = await file.text()
  return JSON.parse(text) as T
}

function txBundleFromSafeTx(params: {
  chainId: number
  network: string
  safeAddress: string
  safeTxHash: string
  safeTransactionData: SafeTransactionData
  signatures: SignatureJson[]
}): SafeTxBundle {
  return {
    version: '1.0',
    safeVersion: V141,
    chainId: params.chainId,
    network: params.network,
    safeAddress: params.safeAddress,
    safeTxHash: params.safeTxHash,
    safeTransactionData: params.safeTransactionData,
    signatures: params.signatures,
    createdAt: new Date().toISOString(),
  }
}

function signaturesToArray(signatures: Map<string, { signer: string; data: string; isContractSignature: boolean }>): SignatureJson[] {
  return Array.from(signatures.values()).map((s) => ({
    signer: s.signer,
    data: s.data,
    isContractSignature: s.isContractSignature,
  }))
}

function safeTxFromBundle(bundle: SafeTxBundle): EthSafeTransaction {
  const tx = new EthSafeTransaction(bundle.safeTransactionData)
  for (const sig of bundle.signatures || []) {
    tx.addSignature(new EthSafeSignature(sig.signer, sig.data, sig.isContractSignature ?? false))
  }
  return tx
}

export default function App() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('testnet')
  const [connectedAccount, setConnectedAccount] = useState<string>('')
  const [walletChainId, setWalletChainId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('Ready')

  const network = NETWORKS[selectedNetwork]
  const [mainnetRpc, setMainnetRpc] = useState(NETWORKS.mainnet.rpcUrl)
  const [testnetRpc, setTestnetRpc] = useState(NETWORKS.testnet.rpcUrl)

  const [safeOwnersRaw, setSafeOwnersRaw] = useState('')
  const [safeThreshold, setSafeThreshold] = useState(1)
  const [safeSaltNonce, setSafeSaltNonce] = useState('0')
  const [predictedSafeAddress, setPredictedSafeAddress] = useState('')

  const [safeAddressInput, setSafeAddressInput] = useState('')
  const [txTemplateFile, setTxTemplateFile] = useState<File | null>(null)
  const [createdBundle, setCreatedBundle] = useState<SafeTxBundle | null>(null)

  const [bundleFile, setBundleFile] = useState<File | null>(null)
  const [loadedBundle, setLoadedBundle] = useState<SafeTxBundle | null>(null)
  const [providedHash, setProvidedHash] = useState('')

  const effectiveRpcs = useMemo(
    () => ({
      mainnet: mainnetRpc.trim() || NETWORKS.mainnet.rpcUrl,
      testnet: testnetRpc.trim() || NETWORKS.testnet.rpcUrl,
    }),
    [mainnetRpc, testnetRpc],
  )

  async function connectWallet() {
    const ethereum = getEthereum()
    if (!ethereum) {
      setStatus('No injected wallet found. Install MetaMask/Rabby/etc.')
      return
    }

    try {
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      const chainHex = (await ethereum.request({ method: 'eth_chainId' })) as string
      setConnectedAccount(accounts[0] || '')
      setWalletChainId(Number(chainHex))
      setStatus('Wallet connected')
    } catch (err) {
      setStatus(`Wallet connect failed: ${(err as Error).message}`)
    }
  }

  async function ensureChain(target: NetworkConfig) {
    const ethereum = getEthereum()
    if (!ethereum) throw new Error('No injected wallet found')

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: toHexChainId(target.chainId) }],
      })
    } catch (switchErr) {
      const errObj = switchErr as { code?: number; message?: string }
      if (errObj.code !== 4902) {
        throw new Error(errObj.message || 'Failed to switch chain')
      }

      const rpcUrl = target.key === 'mainnet' ? effectiveRpcs.mainnet : effectiveRpcs.testnet
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: toHexChainId(target.chainId),
            chainName: target.name,
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [target.explorerUrl],
          },
        ],
      })
    }

    const chainHex = (await ethereum.request({ method: 'eth_chainId' })) as string
    setWalletChainId(Number(chainHex))
  }

  async function switchTo(networkKey: NetworkKey) {
    setSelectedNetwork(networkKey)
    const target = NETWORKS[networkKey]
    try {
      await ensureChain(target)
      setStatus(`Switched to ${target.name}`)
    } catch (err) {
      setStatus(`Chain switch failed: ${(err as Error).message}`)
    }
  }

  async function initSafeForAddress(safeAddress: string) {
    const ethereum = getEthereum()
    if (!ethereum) throw new Error('No injected wallet found')
    if (!connectedAccount) throw new Error('Connect wallet first')

    return Safe.init({
      provider: ethereum,
      signer: connectedAccount,
      safeAddress,
      contractNetworks: buildContractNetworks(network.chainId),
      onchainAnalytics: { project: 'gnosis-safe-private', platform: 'web' },
    })
  }

  async function createSafeWallet() {
    const ethereum = getEthereum()
    if (!ethereum) {
      setStatus('No injected wallet found')
      return
    }
    if (!connectedAccount) {
      setStatus('Connect wallet first')
      return
    }

    try {
      await ensureChain(network)

      const owners = parseOwners(safeOwnersRaw)
      if (!owners.length) throw new Error('At least one owner is required')
      if (!owners.includes(connectedAccount.toLowerCase())) {
        throw new Error('Connected account must be included in owners list')
      }
      if (safeThreshold < 1 || safeThreshold > owners.length) {
        throw new Error(`Threshold must be between 1 and owners count (${owners.length})`)
      }

      const protocolKit = await Safe.init({
        provider: ethereum,
        signer: connectedAccount,
        predictedSafe: {
          safeAccountConfig: {
            owners,
            threshold: safeThreshold,
            fallbackHandler: SAFE_CONTRACTS_V141.compatibilityFallbackHandler,
          },
          safeDeploymentConfig: {
            safeVersion: V141,
            saltNonce: safeSaltNonce,
          },
        },
        contractNetworks: buildContractNetworks(network.chainId),
        onchainAnalytics: { project: 'gnosis-safe-private', platform: 'web' },
      })

      const predictedAddress = await protocolKit.getAddress()
      setPredictedSafeAddress(predictedAddress)

      const deploymentTx = await protocolKit.createSafeDeploymentTransaction()
      const provider = new BrowserProvider(ethereum as never)
      const signer = await provider.getSigner()
      const tx = await signer.sendTransaction({
        to: deploymentTx.to,
        data: deploymentTx.data,
        value: BigInt(deploymentTx.value || '0'),
      })

      setStatus(`Safe deployment submitted: ${tx.hash}`)
      await tx.wait()
      setStatus(`Safe deployed at ${predictedAddress}`)
      setSafeAddressInput(predictedAddress)
    } catch (err) {
      setStatus(`Create Safe failed: ${(err as Error).message}`)
    }
  }

  async function constructTransactionFromTemplate() {
    if (!txTemplateFile) {
      setStatus('Select a transaction JSON file first')
      return
    }
    if (!safeAddressInput.trim()) {
      setStatus('Provide Safe address')
      return
    }

    try {
      await ensureChain(network)

      const safe = await initSafeForAddress(safeAddressInput.trim())
      const template = await readJsonFile<TxTemplateJson>(txTemplateFile)

      let safeTx: EthSafeTransaction

      if (template.safeTransactionData) {
        safeTx = new EthSafeTransaction(template.safeTransactionData)
      } else {
        const rawTxs =
          template.transactions && template.transactions.length
            ? template.transactions
            : []

        if (!rawTxs.length) {
          throw new Error('Template must contain either safeTransactionData or non-empty transactions[]')
        }

        const transactions = rawTxs.map((tx) => ({
          to: tx.to,
          value: asString(tx.value, '0'),
          data: tx.data || '0x',
          operation: tx.operation === 1 ? OperationType.DelegateCall : OperationType.Call,
        }))

        const options = template.options
          ? {
              safeTxGas: asString(template.options.safeTxGas, '0'),
              baseGas: asString(template.options.baseGas, '0'),
              gasPrice: asString(template.options.gasPrice, '0'),
              gasToken: template.options.gasToken || '0x0000000000000000000000000000000000000000',
              refundReceiver:
                template.options.refundReceiver || '0x0000000000000000000000000000000000000000',
              nonce: template.options.nonce,
            }
          : undefined

        safeTx = (await safe.createTransaction({ transactions, options })) as EthSafeTransaction
      }

      const safeTxHash = await safe.getTransactionHash(safeTx)
      const bundle = txBundleFromSafeTx({
        chainId: network.chainId,
        network: network.name,
        safeAddress: safeAddressInput.trim(),
        safeTxHash,
        safeTransactionData: safeTx.data,
        signatures: signaturesToArray(safeTx.signatures),
      })

      setCreatedBundle(bundle)
      setStatus(`Transaction created. Hash: ${safeTxHash}`)
    } catch (err) {
      setStatus(`Construct tx failed: ${(err as Error).message}`)
    }
  }

  async function loadBundle() {
    if (!bundleFile) {
      setStatus('Select a bundle JSON file first')
      return
    }

    try {
      const bundle = await readJsonFile<SafeTxBundle>(bundleFile)
      if (!bundle.safeAddress || !bundle.safeTransactionData) {
        throw new Error('Invalid bundle format')
      }
      setLoadedBundle(bundle)
      setProvidedHash(bundle.safeTxHash || '')
      setStatus('Bundle loaded')
    } catch (err) {
      setStatus(`Load bundle failed: ${(err as Error).message}`)
    }
  }

  async function signLoadedBundle() {
    if (!loadedBundle) {
      setStatus('Load a bundle first')
      return
    }

    try {
      await ensureChain(network)
      const safe = await initSafeForAddress(loadedBundle.safeAddress)
      const safeTx = safeTxFromBundle(loadedBundle)

      const computedHash = await safe.getTransactionHash(safeTx)
      if (providedHash && providedHash.toLowerCase() !== computedHash.toLowerCase()) {
        throw new Error('Provided hash does not match computed hash from transaction data')
      }

      const signature = await safe.signHash(computedHash)
      safeTx.addSignature(signature)

      const signedBundle = txBundleFromSafeTx({
        chainId: loadedBundle.chainId,
        network: loadedBundle.network,
        safeAddress: loadedBundle.safeAddress,
        safeTxHash: computedHash,
        safeTransactionData: safeTx.data,
        signatures: signaturesToArray(safeTx.signatures),
      })

      setLoadedBundle(signedBundle)
      setProvidedHash(computedHash)
      setStatus(`Signed by ${truncate(signature.signer)}. Total signatures: ${signedBundle.signatures.length}`)
    } catch (err) {
      setStatus(`Sign failed: ${(err as Error).message}`)
    }
  }

  async function executeLoadedBundle() {
    if (!loadedBundle) {
      setStatus('Load a bundle first')
      return
    }

    try {
      await ensureChain(network)
      const safe = await initSafeForAddress(loadedBundle.safeAddress)
      const safeTx = safeTxFromBundle(loadedBundle)

      const txResult = await safe.executeTransaction(safeTx)
      setStatus(`Execution submitted: ${txResult.hash}`)
    } catch (err) {
      setStatus(`Execution failed: ${(err as Error).message}`)
    }
  }

  return (
    <div className="page">
      <header className="card topbar">
        <div>
          <h1>Fluent Safe UI (v1.4.1)</h1>
          <p className="muted">No backend. File-based multisig signature collection.</p>
        </div>

        <div className="top-actions">
          <select value={selectedNetwork} onChange={(e) => switchTo(e.target.value as NetworkKey)}>
            <option value="testnet">Fluent Testnet (20994)</option>
            <option value="mainnet">Fluent Mainnet (25363)</option>
          </select>
          <button onClick={connectWallet}>{connectedAccount ? 'Reconnect Wallet' : 'Connect Wallet'}</button>
        </div>

        <div className="status-grid">
          <div>
            <span className="label">Wallet</span>
            <span>{connectedAccount ? truncate(connectedAccount) : 'Not connected'}</span>
          </div>
          <div>
            <span className="label">Wallet chainId</span>
            <span>{walletChainId ?? '-'}</span>
          </div>
          <div>
            <span className="label">Selected network</span>
            <span>{network.name}</span>
          </div>
          <div>
            <span className="label">Safe singleton</span>
            <span>{truncate(SAFE_CONTRACTS_V141.safeL2)} (SafeL2)</span>
          </div>
        </div>
      </header>

      <section className="card">
        <h2>Network RPC settings</h2>
        <div className="two-col">
          <label>
            Mainnet RPC
            <input value={mainnetRpc} onChange={(e) => setMainnetRpc(e.target.value)} />
          </label>
          <label>
            Testnet RPC
            <input value={testnetRpc} onChange={(e) => setTestnetRpc(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>1) Create new Safe wallet</h2>
        <p className="muted">Owners can be comma/newline/space separated. Connected wallet must be included.</p>
        <div className="form-grid">
          <label>
            Owners
            <textarea
              rows={4}
              placeholder="0xOwner1, 0xOwner2, ..."
              value={safeOwnersRaw}
              onChange={(e) => setSafeOwnersRaw(e.target.value)}
            />
          </label>
          <label>
            Threshold
            <input
              type="number"
              min={1}
              value={safeThreshold}
              onChange={(e) => setSafeThreshold(Number(e.target.value) || 1)}
            />
          </label>
          <label>
            Salt nonce
            <input value={safeSaltNonce} onChange={(e) => setSafeSaltNonce(e.target.value)} />
          </label>
        </div>
        <div className="row">
          <button onClick={createSafeWallet}>Deploy Safe</button>
          {predictedSafeAddress && <code>Predicted: {predictedSafeAddress}</code>}
        </div>
      </section>

      <section className="card">
        <h2>2) Build transaction package from JSON</h2>
        <p className="muted">
          Upload a tx template JSON (transactions/options) or a full safeTransactionData payload. The app computes safeTxHash and
          exports a shareable signing bundle.
        </p>

        <div className="form-grid">
          <label>
            Safe address
            <input
              placeholder="0x..."
              value={safeAddressInput}
              onChange={(e) => setSafeAddressInput(e.target.value)}
            />
          </label>
          <label>
            Transaction template JSON
            <input
              type="file"
              accept="application/json"
              onChange={(e) => setTxTemplateFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="row">
          <button onClick={constructTransactionFromTemplate}>Build package</button>
          {createdBundle && (
            <button onClick={() => downloadJson(`safe-tx-${createdBundle.safeTxHash}.json`, createdBundle)}>
              Download bundle JSON
            </button>
          )}
        </div>

        {createdBundle && (
          <div className="result">
            <div><b>Safe tx hash:</b> <code>{createdBundle.safeTxHash}</code></div>
            <div><b>Signatures:</b> {createdBundle.signatures.length}</div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>3) Sign / execute existing package</h2>
        <p className="muted">
          Load a bundle JSON, validate hash, append your signature, re-download, and execute when threshold is met.
        </p>

        <div className="form-grid">
          <label>
            Bundle JSON
            <input
              type="file"
              accept="application/json"
              onChange={(e) => setBundleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            Optional hash override/verification
            <input
              placeholder="0x..."
              value={providedHash}
              onChange={(e) => setProvidedHash(e.target.value)}
            />
          </label>
        </div>

        <div className="row">
          <button onClick={loadBundle}>Load bundle</button>
          <button onClick={signLoadedBundle} disabled={!loadedBundle}>Sign bundle</button>
          <button
            onClick={() => loadedBundle && downloadJson(`safe-tx-signed-${loadedBundle.safeTxHash}.json`, loadedBundle)}
            disabled={!loadedBundle}
          >
            Download updated bundle
          </button>
          <button onClick={executeLoadedBundle} disabled={!loadedBundle}>Execute tx</button>
        </div>

        {loadedBundle && (
          <div className="result">
            <div><b>Safe:</b> <code>{loadedBundle.safeAddress}</code></div>
            <div><b>Hash:</b> <code>{loadedBundle.safeTxHash}</code></div>
            <div><b>Signatures:</b> {loadedBundle.signatures.length}</div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Template JSON format</h2>
        <pre>{`{
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
}`}</pre>
      </section>

      <footer className="status">{status}</footer>
    </div>
  )
}
