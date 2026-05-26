# AI Providers Architecture

## Overview

Two AI systems coexist:

1. **Legacy:** `AiVisionService` (single provider, Qwen only) — actively used by `/api/ai/recognize` and `/api/ai/compare`
2. **New:** `ai-providers/` (multi-provider with registry + router) — implemented but only partially connected

## New Architecture

```
                    ┌─────────────────┐
                    │   AiRouter      │
                    │   (singleton)   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │ ProviderRegistry│
                    │   (singleton)   │
                    └────────┬────────┘
                             │
        ┌────────────┬───────┼───────┬────────────┐
        │            │       │       │            │
   ┌────┴────┐ ┌────┴────┐ ┌┴─────┐ ┌┴──────┐ ┌──┴──────┐
   │  Qwen   │ │ OpenAI  │ │Claude│ │Gemini │ │(future)│
   │Priority0│ │Priority1│ │  P2  │ │  P3   │ │        │
   └─────────┘ └─────────┘ └──────┘ └───────┘ └────────┘
```

## Core Interfaces

### IAiProvider

```typescript
interface IAiProvider {
  providerName: string;
  displayName: string;
  supportedModels: string[];
  defaultModel: string;
  recognize(request: RecognizeRequest): Promise<string>;
  compare(request: CompareRequest): Promise<string>;
  chat(messages: ChatMessage[], model?: string): Promise<string>;
}
```

### RecognizeRequest

```typescript
interface RecognizeRequest {
  image: string;           // Base64 or URL
  prompt?: string;         // Custom prompt
  templateId?: string;     // Template ID
  model?: string;          // Override model
}
```

### CompareRequest

```typescript
interface CompareRequest {
  images: string[];        // Array of Base64/URL
  prompt?: string;
  templateId?: string;
  model?: string;
}
```

## Provider Details

### Qwen (DashScope) — Priority 0

- **SDK:** `openai` npm package (DashScope is OpenAI-compatible)
- **Base URL:** `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **Models:** `qwen3.6-flash` (default), `qwen-vl-max` (compare), `qwen-vl-ocr-latest`
- **Image handling:** Base64 via `image_url.url` format

### OpenAI GPT — Priority 1

- **SDK:** `openai` npm package
- **Base URL:** `https://api.openai.com/v1`
- **Models:** `gpt-4o` (default), `gpt-4o-mini`, `gpt-4-turbo`

### Claude — Priority 2

- **SDK:** Raw `fetch()` (native Anthropic API)
- **Base URL:** `https://api.anthropic.com`
- **Headers:** `x-api-key`, `anthropic-version: 2023-06-01`
- **Models:** `claude-3-5-sonnet-20241022` (default), `claude-3-opus-20240229`, `claude-3-haiku-20240307`
- **Image format:** `{ type: 'image', source: { type: 'base64', media_type, data } }`
- **Max tokens:** 4096 (hardcoded)

### Gemini — Priority 3

- **SDK:** Raw `fetch()` (native Google AI API)
- **Base URL:** `https://generativelanguage.googleapis.com`
- **Endpoint:** `v1beta/models/{model}:generateContent?key={apiKey}`
- **Models:** `gemini-2.0-flash` (default), `gemini-1.5-pro`, `gemini-1.5-flash`
- **Chat:** `assistant` role mapped to `model` for Gemini compatibility

## Router Behavior

```typescript
// Usage
await aiRouter.recognize(image, 'product-analysis');
await aiRouter.recognize(image, 'product-analysis', 'gpt-4o');
await aiRouter.recognize(image, 'product-analysis', undefined, { providerName: 'claude' });
await aiRouter.compare(images, 'compare-products');
await aiRouter.chat(messages, 'claude-3-5-sonnet-20241022');
```

### Fallback Chain

```
Request with providerName='openai'
  → Try OpenAI → success → return
  → Try OpenAI → fail → log warning
  → Try Qwen (next available) → success → return
  → Try Claude → fail → log warning
  → Try Gemini → fail → throw "All providers failed"
```

## Initialization

```typescript
// On server startup
await initializeProviders();
// For each provider (qwen, openai, claude, gemini):
//   1. Check DB for saved config (apiKeyConfig)
//   2. Fall back to environment variables
//   3. If key found → create provider instance → register with priority
```

### Hot Reload

```typescript
await reloadProvider('qwen'); // Unregister old, reinitialize with new config
```

## API Key Encryption

```
Machine ID: {userData}/.ai-crossborder-machine-id (generated once)
  ↓
scryptSync(machineId, 'ai-crossborder-pro-salt', 32)
  ↓
AES-256-GCM key
  ↓
Encrypt API key → format: iv:authTag:ciphertext (base64)
  ↓
Store in settings table: key = 'ai_key_{provider}'
```

## Prompt Templates

| ID | Purpose |
|----|---------|
| `product-analysis` | Deep product teardown for Amazon home goods |
| `general` | General purpose recognition |
| `extract-title` | Extract product title from image |
| `extract-price` | Extract price from image |
| `extract-specs` | Extract specifications |
| `extract-features` | Extract feature list |
| `extract-search-keywords` | English Amazon search keywords |
| `ocr` | Text recognition |
| `listing-copy` | Listing copywriting |
| `compare-products` | Multi-product comparison |

Templates defined in `ai-providers/templates.ts`. Also duplicated in `services/ai-vision-service.ts` (legacy).

## Browser-Based AI Services

These use Playwright to interact with AI chatbot web interfaces:

| Service | File | How It Works |
|---------|------|-------------|
| `GeminiFileService` | `services/gemini-file-service.ts` | Opens Gemini web, uploads file, sends prompt, extracts response |
| `ChatGPTFileService` | `services/chatgpt-file-service.ts` | Opens ChatGPT web, uploads file, sends prompt, extracts response |

Used by `/api/gemini/upload`, `/api/chatgpt/upload`, and `/api/ai/optimize`.

**Advantages:** Can handle file uploads larger than direct API limits
**Disadvantages:** Slow, fragile (depends on web UI), requires browser instance
