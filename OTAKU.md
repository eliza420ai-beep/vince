# Otaku AI Agent

A DeFi-focused AI agent built on ElizaOS, featuring a modern React frontend, Coinbase Developer Platform (CDP) wallet integration, and comprehensive DeFi capabilities including swaps, bridging, analytics, and market data.

**Full reference:** The canonical Otaku project (structure, plugins, scripts, env, and deployment) is **[github.com/elizaOS/otaku](https://github.com/elizaOS/otaku/)**. Use it for the complete plugin set, `managers/`, workspace packages (`api-client`, `server`), and up-to-date docs.

## Features

- **AI Agent Interface** - Real-time chat with Otaku, a DeFi analyst agent
- **CDP Wallet Integration** - Secure authentication and wallet management via Coinbase Developer Platform
- **Multi-Chain Support** - Interact with Ethereum, Base, Polygon, Arbitrum, and more
- **DeFi Actions** - Token swaps, transfers, bridging, and NFT operations
- **Market Data** - Real-time token prices, trending tokens/collections, and DeFi protocol analytics
- **Web Search** - Web search and crypto news integration
- **Modern UI** - Responsive design with Tailwind CSS, Radix UI components, and smooth animations
- **Real-time Communication** - WebSocket-powered instant messaging via Socket.IO


## Architecture

This is a monorepo workspace project built with:

- **Runtime**: Bun 1.2.21
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Custom ElizaOS Server build (based on @elizaos/server)
- **Build System**: Turbo
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI
- **State Management**: Zustand, React Query
- **WebSocket**: Socket.IO Client

### Project Structure

The layout below mirrors [elizaOS/otaku](https://github.com/elizaOS/otaku/). This repo may only include a subset (e.g. `src/agents/otaku.ts` and some plugins).

```
├── src/
│   ├── index.ts              # Main entry point (agent & plugin config)
│   ├── character.ts         # Otaku agent character definition
│   ├── managers/            # Backend managers (Otaku repo)
│   │   └── cdp-transaction-manager.ts   # CDP transaction handling
│   ├── frontend/             # React application
│   │   ├── App.tsx          # Main App component with CDP integration
│   │   ├── components/      # chat/, dashboard/, agents/, auth/, ui/
│   │   ├── lib/             # elizaClient.ts, socketManager.ts, cdpUser.ts
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── types/
│   ├── packages/            # Workspace packages (Otaku repo)
│   │   ├── api-client/       # @elizaos/api-client
│   │   └── server/          # @elizaos/server (custom ElizaOS server)
│   └── plugins/             # Plugins required for full Otaku (see Plugins section)
│       ├── plugin-biconomy/
│       ├── plugin-bootstrap/
│       ├── plugin-cdp/
│       ├── plugin-clanker/
│       ├── plugin-coingecko/
│       ├── plugin-defillama/
│       ├── plugin-etherscan/
│       ├── plugin-gamification/
│       ├── plugin-morpho/
│       ├── plugin-polymarket-discovery/
│       ├── plugin-relay/
│       └── plugin-web-search/
├── dist/
├── build.ts
├── start-server.ts
├── vite.config.ts
├── tailwind.config.js
├── turbo.json
└── package.json
```

## Prerequisites

- [Bun](https://bun.sh/) 1.2.21+ installed on your system
- Node.js 18+ (for compatibility)
- Coinbase Developer Platform project ID (for CDP wallet features)

### Otaku agent: extra dependencies and plugins

To have the **Otaku agent** (`src/agents/otaku.ts`) fully operational (wallet, swaps, x402 payments, Morpho, Relay, Polymarket, etc.), you need the **plugins** and **dependencies** from the official Otaku repo. The canonical list is in [elizaOS/otaku `package.json`](https://github.com/elizaOS/otaku/blob/master/package.json). This project may ship with stubs or a subset; for full Otaku behavior, align with that list.

**All dependencies from [elizaOS/otaku package.json](https://raw.githubusercontent.com/elizaOS/otaku/master/package.json):**

| Package | Version (Otaku) |
|---------|------------------|
| **CDP & x402** | |
| `@coinbase/cdp-core` | 0.0.70 |
| `@coinbase/cdp-hooks` | 0.0.70 |
| `@coinbase/cdp-react` | 0.0.70 |
| `@coinbase/cdp-sdk` | 1.38.6 |
| `@coinbase/x402` | 0.7.3 |
| **ElizaOS** | |
| `@elizaos/core` | 1.7.0 |
| `@elizaos/plugin-analytics` | 1.0.1 |
| `@elizaos/plugin-anthropic` | 1.5.12 |
| `@elizaos/plugin-mcp` | latest |
| `@elizaos/plugin-openai` | 1.6.0 |
| `@elizaos/plugin-openrouter` | 1.5.17 |
| `@elizaos/plugin-sql` | 1.7.0 |
| **DeFi / protocols** | |
| `@morpho-org/blue-sdk` | 4.13.1 |
| `@morpho-org/blue-sdk-viem` | 3.2.0 |
| `@morpho-org/morpho-ts` | 2.4.5 |
| `@polymarket/sdk` | ^6.0.1 |
| `@relayprotocol/relay-sdk` | 2.4.6 |
| **x402 stack** | |
| `x402-axios` | 0.7.2 |
| `x402-express` | 0.7.3 |
| `x402-fetch` | 0.7.3 |
| **UI / React** | |
| `@number-flow/react` | ^0.5.10 |
| `@radix-ui/react-accordion` | 1.2.2 |
| `@radix-ui/react-avatar` | 1.1.2 |
| `@radix-ui/react-checkbox` | 1.1.3 |
| `@radix-ui/react-collapsible` | 1.1.12 |
| `@radix-ui/react-dialog` | 1.1.15 |
| `@radix-ui/react-dropdown-menu` | 2.1.4 |
| `@radix-ui/react-label` | 2.1.1 |
| `@radix-ui/react-popover` | 1.1.15 |
| `@radix-ui/react-scroll-area` | 1.2.2 |
| `@radix-ui/react-select` | 2.1.4 |
| `@radix-ui/react-separator` | 1.1.8 |
| `@radix-ui/react-slider` | 1.2.2 |
| `@radix-ui/react-slot` | 1.2.4 |
| `@radix-ui/react-switch` | 1.1.2 |
| `@radix-ui/react-tabs` | 1.1.13 |
| `@radix-ui/react-tooltip` | 1.2.8 |
| `@tanstack/react-query` | 5.90.11 |
| `framer-motion` | 12.23.25 |
| `lucide-react` | 0.454.0 |
| `next-themes` | ^0.4.6 |
| `react` | 18.3.1 |
| `react-dom` | 18.3.1 |
| `react-router-dom` | 6.30.2 |
| `recharts` | 3.5.1 |
| `vaul` | 0.9.9 |
| **Data / backend** | |
| `@tavily/core` | 0.5.13 |
| `axios` | 1.13.2 |
| `bignumber.js` | 9.3.1 |
| `clanker-sdk` | 4.2.5 |
| `drizzle-orm` | 0.44.7 |
| `jsonwebtoken` | ^9.0.3 |
| `pg` | ^8.16.3 |
| `postgres` | ^3.4.7 |
| **Other** | |
| `class-variance-authority` | 0.7.1 |
| `clsx` | 2.1.1 |
| `cors` | 2.8.5 |
| `date-fns` | 4.1.0 |
| `socket.io-client` | 4.8.1 |
| `streamdown` | 1.6.10 |
| `tailwind-merge` | 2.6.0 |
| `unique-names-generator` | 4.7.1 |
| `uuid` | 13.0.0 |
| `viem` | 2.41.2 |
| `zod` | 4.1.13 |
| `zustand` | 5.0.9 |

*(Workspace packages in Otaku: `@elizaos/api-client`, `@elizaos/server` — use your local workspace or the versions that match your ElizaOS stack.)*

**x402-related:** The x402 protocol is used for paid API requests (e.g. `FETCH_WITH_PAYMENT`). You need the **x402 plugin** or integration, the packages above (`@coinbase/x402`, `x402-axios`, `x402-express`, `x402-fetch`), and env vars such as `X402_RECEIVING_WALLET`, `X402_PUBLIC_URL`, `X402_FACILITATOR_URL` (see `.env.example` and `docs/x402-payments.md` if present).

**Plugins:** Otaku expects all plugins listed in the [Plugins](#plugins) section (CDP, bootstrap, Clanker, CoinGecko, DeFiLlama, Etherscan, Morpho, Polymarket discovery, Relay, web search, Biconomy, gamification) plus `@elizaos/plugin-sql`. The full set lives in [elizaOS/otaku](https://github.com/elizaOS/otaku/). Ensure the project’s agent config (e.g. in `src/index.ts`) registers the Otaku agent with this plugin list.

If these are missing, the Otaku agent may start but wallet, swap, paid-request, and protocol-specific features will be unavailable or fall back to stubs.

## Running Locally

### 1. Install dependencies

Run the install step from the repository root:

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the secrets marked as **required** in the sample file. (This project uses `.env.example` as the template.) You will need at least:

- `JWT_SECRET`
- An AI provider key (`OPENAI_API_KEY` or `OPENROUTER_API_KEY`)
- Coinbase credentials (`VITE_CDP_PROJECT_ID`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`)
- `ALCHEMY_API_KEY`

By default the server stores data in an embedded PGlite database at `./.eliza/.elizadb`. Set `POSTGRES_URL` (for example to a Neon or Railway Postgres connection string) if you want to use PostgreSQL instead.

### 3. Start the development server

```bash
bun start
```
or
```bash
bun run dev
```

This runs `scripts/dev-with-vite.js`, which starts the **ElizaOS backend on port 3000** and the **Vite dev server** (e.g. port 5173). **Use the URL the script prints** (e.g. http://localhost:5173) for the chat UI; port 3000 serves the API and the default ElizaOS dashboard. Keep this process running while you work.

Use `bun run dev:watch` if you prefer Turbo to rebuild workspaces on every file change. For fast UI iteration you can also run the Vite dev server in a second terminal:

```bash
cd src/frontend
bunx vite dev
```

### 4. Build a production bundle locally

```bash
bun run build
SERVER_PORT=3000 NODE_ENV=production bun run start
```

The `build` script compiles the backend to `dist/index.js`, emits type declarations for workspaces, and outputs the static frontend to `dist/frontend/`. The `start` script reuses the compiled assets, so you can run it anywhere Bun is available.

### Available Scripts

- `bun run dev` - Build and start development server
- `bun run dev:watch` - Watch mode with auto-rebuild
- `bun run build` - Build for production (all packages + frontend)
- `bun run build:all` - Build all workspace packages via Turbo
- `bun run build:backend` - Build backend only
- `bun run build:frontend` - Build frontend only
- `bun run start` - Start production server
- `bun run type-check` - Check TypeScript types

Note: The server serves the built frontend from `dist/frontend`. To see UI changes, rebuild the frontend (`bun run build:frontend`).

## Plugins

Plugins needed for full Otaku behavior come from the [elizaOS/otaku](https://github.com/elizaOS/otaku/) repo. Register them in the Otaku agent config (e.g. `src/index.ts` or wherever the Otaku character is loaded).

| Plugin | Purpose |
|--------|--------|
| **plugin-biconomy** | Biconomy (account abstraction / gasless tx) |
| **plugin-bootstrap** | Core ElizaOS bootstrap (actions, evaluators, providers) |
| **plugin-cdp** | Coinbase Developer Platform (wallet, swaps, transfers, x402) |
| **plugin-clanker** | Clanker SDK integration (e.g. stablecoins / payments) |
| **plugin-coingecko** | CoinGecko (prices, trending, NFT stats) |
| **plugin-defillama** | DeFiLlama (protocol TVL, analytics) |
| **plugin-etherscan** | Etherscan (transaction confirmation checks) |
| **plugin-gamification** | Gamification / engagement features |
| **plugin-morpho** | Morpho protocol (lending / Blue SDK) |
| **plugin-polymarket-discovery** | Polymarket discovery / prediction markets |
| **plugin-relay** | Relay Protocol (cross-chain bridging) |
| **plugin-web-search** | Web search (Tavily) and crypto news (CoinDesk) |

Plus **@elizaos/plugin-sql** for database (messages, memories, state).

### CDP Plugin (plugin-cdp)

Coinbase Developer Platform integration providing wallet and payment functionality.

**Actions:**
- `USER_WALLET_INFO` - View wallet balances, tokens, and NFTs
- `CHECK_TOKEN_BALANCE` - Fast balance check for specific tokens (optimized for transaction validation)
- `USER_WALLET_TOKEN_TRANSFER` - Transfer ERC20 tokens to other addresses
- `USER_WALLET_NFT_TRANSFER` - Transfer NFTs to other addresses
- `USER_WALLET_SWAP` - Swap tokens using DEX aggregators
- `FETCH_WITH_PAYMENT` - Make paid API requests using x402 protocol

**Features:**
- Automatic wallet creation on first login
- Multi-chain support (Ethereum, Base, Polygon, Arbitrum, etc.)
- Automatic transaction signing via CDP
- x402 protocol support for paid API requests

**Example Prompts:**
- "Show my wallet portfolio"
- "Transfer 0.01 ETH to 0x..."
- "Swap 100 USDC for ETH"
- "Transfer NFT #123 from collection 0x..."

**Further Reading:** See the x402 payments integration guide in [`docs/x402-payments.md`](./docs/x402-payments.md) for details on running paid jobs against `otaku.so` using automatic USDC payments.

### CoinGecko Plugin (plugin-coingecko)

Real-time token prices, market data, and trending information.

**Actions:**
- `GET_TOKEN_PRICE_CHART` - Get historical price data with charts
- `GET_TRENDING_TOKENS` - Get trending tokens by market cap
- `GET_TRENDING_SEARCH` - Get trending search terms
- `GET_TOKEN_METADATA` - Get token information and metadata
- `GET_NFT_COLLECTION_STATS` - Get NFT collection statistics

**Example Prompts:**
- "Get ETH price chart and insights"
- "What's trending on Base?"
- "Show me trending NFT collections"
- "Get Bitcoin price"

### Web Search Plugin (plugin-web-search)

Web search and crypto news aggregation.

**Actions:**
- `WEB_SEARCH` - Search the web using Tavily API
- `CRYPTO_NEWS` - Get latest crypto news from CoinDesk

**Example Prompts:**
- "Latest DeFi news"
- "Search for Ethereum upgrades"
- "Crypto market news today"

### DeFiLlama Plugin (plugin-defillama)

DeFi protocol analytics and TVL (Total Value Locked) data.

**Actions:**
- `GET_PROTOCOL_TVL` - Get TVL data for DeFi protocols

**Example Prompts:**
- "Compare Aave vs Uniswap TVL"
- "Get Uniswap TVL"
- "Compare Eigen vs Morpho"

### Relay Plugin (plugin-relay)

Cross-chain asset bridging via Relay Protocol.

**Actions:**
- `RELAY_BRIDGE` - Bridge assets across chains
- `RELAY_QUOTE` - Get bridge quotes
- `RELAY_STATUS` - Check bridge transaction status

**Example Prompts:**
- "Bridge USDC from Base to Arbitrum"
- "Get bridge quote for 100 USDC"
- "Check bridge status for tx 0x..."

### Etherscan Plugin (plugin-etherscan)

Transaction verification and confirmation checking.

**Actions:**
- `CHECK_TRANSACTION_CONFIRMATION` - Verify transaction confirmations

**Example Prompts:**
- "Check confirmation for tx 0x..."
- "Verify transaction status 0x..."
- "How many confirmations for 0x..."

### Bootstrap Plugin (plugin-bootstrap)

Otaku ships with a custom build of the ElizaOS bootstrap plugin providing essential agent capabilities plus advanced multi-step planning and reasoning frameworks:
- Action execution
- Message evaluation
- State management
- Memory and knowledge providers

### SQL Plugin (@elizaos/plugin-sql)

Database integration for persistent storage of messages, memories, and agent state.

### Biconomy Plugin (plugin-biconomy)

Account abstraction / gasless transaction support (Biconomy). See [elizaOS/otaku](https://github.com/elizaOS/otaku/) for actions and config.

### Clanker Plugin (plugin-clanker)

[Clanker](https://github.com/elizaOS/otaku/tree/master/src/plugins/plugin-clanker) SDK integration (e.g. stablecoins, payments). Requires `clanker-sdk` in `package.json`.

### Gamification Plugin (plugin-gamification)

Gamification and engagement features for the Otaku agent. See the Otaku repo for actions and configuration.

### Morpho Plugin (plugin-morpho)

[Morpho](https://github.com/elizaOS/otaku/tree/master/src/plugins/plugin-morpho) protocol integration (lending, Blue SDK). Uses `@morpho-org/blue-sdk`, `@morpho-org/morpho-ts` from `package.json`.

### Polymarket Discovery Plugin (plugin-polymarket-discovery)

Polymarket discovery and prediction markets. Uses `@polymarket/sdk`. See [elizaOS/otaku](https://github.com/elizaOS/otaku/) for actions.

## Agent: Otaku

Otaku is a DeFi-focused AI agent (`src/agents/otaku.ts`) designed to provide:

- **Clear, evidence-based guidance** - Uses on-chain and market data to inform conclusions
- **Portfolio diagnostics** - Analyzes and optimizes DeFi portfolios
- **Risk assessment** - Grounded in TVL, audits, and liquidity depth
- **Cross-chain expertise** - Handles bridging and routing across chains
- **Transaction safety** - Always verifies wallet balance before executing on-chain actions

**Character Traits:**
- Data-first approach with concise recommendations
- Precision over hype
- References concrete metrics
- Natural, conversational style
- Direct and punchy communication

For full operation (wallet, swaps, x402), see [Otaku agent: extra dependencies and plugins](#otaku-agent-extra-dependencies-and-plugins) under Prerequisites.

## Frontend Architecture

### Components

- **Chat Interface** (`components/chat/`) - Main chat UI with message history, input, and action tools
- **Dashboard** (`components/dashboard/`) - Sidebar, wallet card, widgets, notifications, account page
- **Agents** (`components/agents/`) - Agent selection and management
- **Auth** (`components/auth/`) - CDP sign-in modal
- **UI** (`components/ui/`) - Reusable Radix UI components

### Key Libraries

- **@tanstack/react-query** - Server state management and caching
- **zustand** - Client state management
- **socket.io-client** - WebSocket real-time communication
- **@coinbase/cdp-react** - CDP React integration
- **recharts** - Chart visualization
- **framer-motion** - Animations
- **lucide-react** - Icons

### State Management

- **React Query** - API data fetching and caching
- **Zustand** - Client-side state (if needed)
- **React Context** - Loading panels, modals
- **CDP Hooks** - Wallet state via `@coinbase/cdp-hooks`

## API Client

The project includes a type-safe API client (`@elizaos/api-client`) for interacting with the ElizaOS server:

```typescript
import { elizaClient } from './lib/elizaClient';

// List agents
const { agents } = await elizaClient.agents.listAgents();

// Get agent details
const agent = await elizaClient.agents.getAgent(agentId);

// Send message
const message = await elizaClient.messaging.postMessage(channelId, 'Hello!');

// Get messages
const messages = await elizaClient.messaging.getMessagesForChannel(channelId);

// Create session
const session = await elizaClient.sessions.createSession({
  agentId: agent.id,
  userId: 'user-123',
});

// Send session message
await elizaClient.sessions.sendMessage(session.sessionId, {
  content: 'Hello, agent!',
});
```

## WebSocket Communication

Real-time communication via Socket.IO:

```typescript
import { socketManager } from './lib/socketManager';

// Connect
socketManager.connect(userId);

// Join channel
socketManager.joinChannel(channelId, serverId);

// Send message
socketManager.sendMessage(channelId, 'Hello!', serverId);

// Listen for messages
socketManager.onMessage((data) => {
  console.log('New message:', data);
});
```

## Customization

### Modifying the Agent

Edit `src/character.ts` to customize Otaku's personality, system prompt, bio, topics, and message examples.

### Customizing the UI

- **Styles**: Edit `src/frontend/index.css` or modify Tailwind classes
- **Components**: Create new components in `src/frontend/components/`
- **Theme**: Update `tailwind.config.js` for colors and design tokens

### Adding Plugins

1. Create plugin in `src/plugins/plugin-name/`
2. Implement actions, services, and providers as needed
3. Add plugin to `src/index.ts` in the `projectAgent.plugins` array
4. Rebuild: `bun run build`

### Adding Features

1. **New API Endpoints**: Use `elizaClient` in your components
2. **Real-time Updates**: Use `socketManager` for WebSocket events
3. **New Routes**: Add routes in `App.tsx`

## Development

### Workspace Packages

This project uses Bun workspaces for:
- `@elizaos/api-client` - Type-safe API client
- `@elizaos/server` - ElizaOS server runtime
- Custom plugins in `src/plugins/*`

### Type Checking

```bash
bun run type-check
```

### Building

```bash
# Build all workspace packages
bun run build:all

# Build specific package
cd src/packages/api-client && bun run build
```

## Deploying to Railway

The production deployment at `otaku.so` runs on [Railway](https://railway.app) using two services: a Postgres database with the pgvector extension and the Otaku web service. The screenshots above show the `pgvector` service (with a persistent volume) and the `otaku-fe` service connected to the `master` branch.

### Prerequisites

- Railway account with permission to link the GitHub repository
- Bun-compatible Nixpacks deployment (automatic when a `bun.lock` is present)
- All production secrets available (see `.env.sample`)

### 1. Provision the database

1. Create a new Railway project (or open an existing one).
2. Add a **PostgreSQL** service and choose the **pgvector** template so embeddings are supported.
3. Railway will expose a `DATABASE_URL`. Copy it—you will map this to the `POSTGRES_URL` environment variable for the app service.
4. (Recommended) Attach a volume to the database service so the data survives restarts, matching the `pgvector-volume` in the screenshot.

### 2. Add the Otaku service

1. Click **New Service → Deploy from GitHub** and select the Otaku repository/branch (e.g. `master`).
2. In the **Deployments → Build & Deploy** panel set:
   - **Build Command:** `bun run build`
   - **Start Command:** `SERVER_PORT=$PORT bun run start`
   This ensures the server listens on the dynamic port that Railway provides via the `PORT` variable.
3. Enable "Wait for CI" if you link the service to GitHub Actions, otherwise Railway will build directly from the commit.

### 3. Configure environment variables

Open the **Variables** tab for the web service and mirror the values from your local `.env`. The critical production keys are:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Auth token signing secret |
| `OPENAI_API_KEY` or `OPENROUTER_API_KEY` | AI provider |
| `VITE_CDP_PROJECT_ID` | CDP project for frontend login |
| `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` | Backend wallet operations |
| `ALCHEMY_API_KEY` | Chain data and balances |
| `POSTGRES_URL` | PostgreSQL connection string (from Neon, Railway, or other provider) |
| `X402_RECEIVING_WALLET`, `X402_PUBLIC_URL`, `X402_FACILITATOR_URL` | x402 payment configuration |
| `NODE_ENV` | Set to `production` |
| `LOG_LEVEL` | Optional logging verbosity |

Railway's UI supports bulk edits—`railway variables set KEY=value` in the CLI is another quick way to sync secrets. Keep `.env.sample` updated so every teammate knows which keys need to be added.

### 4. Trigger the first deploy

Deployments kick off automatically after configuration changes, or you can trigger one manually. During the build Railway will run `bun install`, execute `bun run build`, and finally start the server using the command above. Watch the logs to confirm the server prints the `Server with custom UI running...` message.

### 5. Finalize networking

- Under **Networking**, attach the default Railway URL generated for the service (for example, `your-service-name.up.railway.app`) or connect your own domain.
- If you use a custom domain, point the DNS `CNAME` record to the Railway edge URL and wait for the certificate status to show "Setup complete".

### 6. Post-deploy checklist

- Hit the `/api/server/health` endpoint to verify the service responds.
- Ensure paid endpoints (`/api/messaging/jobs`) work after seeding the required env vars.
- Set up alerts and log drains if you need production monitoring.

## Troubleshooting

### VINCE / current project vs this doc

This repo is **VINCE** (Otaku-style UI). A few differences from the original Otaku setup this doc describes:

- **Run:** `bun start` or `bun run dev` runs `scripts/dev-with-vite.js` → **backend on :3000**, **Vite dev server on :5173** (or next free port). Use the **URL the script prints** (e.g. `http://localhost:5173`) for the chat UI; port 3000 is the API and default ElizaOS dashboard.
- **Env:** `.env.example` is the template (not `.env.sample`). No `JWT_SECRET` required for guest/local chat; socket auth uses entityId/token from the app.
- **Health:** Prefer `GET /api/server/health` (not `/api/server/ping`).

### Agent replies not reaching the UI (bot status / any message)

If you send a message (e.g. "bot status") and the UI stays on "Analyzing your request" and **never shows the agent's reply**:

1. **Terminal at startup:** Look for:
   - `[SERVICE:MESSAGE-BUS] Error fetching agent servers (error=fetch failed)`
   - `[SERVICE:MESSAGE-BUS] Error fetching channels from server (messageServerId=..., error=fetch failed)`
2. **Cause:** The message bus can't fetch the list of servers/channels (from the central API or local server), so it has no valid routing and never delivers the reply to the frontend.
3. **Fix:** Ensure the central API is reachable if you use `ELIZAOS_API_KEY` (e.g. correct base URL, network, valid key). For fully local runs, check ElizaOS docs for configuring the message bus to use the local server for server/channel listing. See **DEPLOY.md** § "Bot status / agent replies not reaching the UI (local)" and **src/frontend/progress.txt** (KNOWN ISSUES).

### Port Already in Use

Change the port in `.env`:
```bash
SERVER_PORT=3001
```

### Dependencies Not Found

Make sure you're in the project root and run:
```bash
bun install
```

### CDP Not Working

1. Verify `VITE_CDP_PROJECT_ID` is set (frontend)
2. Set backend keys: `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`
3. Set `ALCHEMY_API_KEY` for onchain data (balances/NFTs)
4. Ensure browser allows popups for CDP sign-in

### Frontend Not Loading

1. Check that `vite.config.ts` exists
2. Run `bun run build:frontend` manually
3. **Use the URL printed by `bun start`** (e.g. http://localhost:5173), not only port 3000
4. Check browser console for errors

### Agent Not Responding

1. Verify API keys are set (OpenAI, OpenRouter, or Anthropic)
2. Ensure `JWT_SECRET` is set if using JWT auth (guest mode may work without it)
3. Check server logs for errors — especially **MESSAGE-BUS** "Error fetching agent servers" or "Error fetching channels" (see "Agent replies not reaching the UI" above)
4. Ensure agent is running: `GET /api/agents`
5. Verify WebSocket connection is established (browser console; socket connects to same origin, which proxies to backend)

## Accessing the App

Once running (with `bun start` / `bun run dev`):
- **Chat UI (Vite)**: Use the URL the script prints, e.g. http://localhost:5173
- **Default ElizaOS dashboard**: http://localhost:3000
- **API**: http://localhost:3000/api/
- **Health Check**: http://localhost:3000/api/server/health
- **Agents**: http://localhost:3000/api/agents

## Environment Variables Reference

The canonical list of environment variables — including required, optional, and feature-specific keys — lives in `.env.sample`. Each entry includes inline documentation, default guidance, and links to obtain API credentials. Keep `.env.sample` in sync with any new configuration you introduce so the setup flow stays accurate for every contributor.

## License

MIT

## Acknowledgements

- Design inspiration from [joyco-studio](https://github.com/joyco-studio)

---

Built with [ElizaOS](https://github.com/elizaos/eliza) and [Coinbase Developer Platform](https://docs.cdp.coinbase.com/)

© 2025 Shaw Walters and elizaOS Contributors. Released under the MIT License. See `LICENSE`.
