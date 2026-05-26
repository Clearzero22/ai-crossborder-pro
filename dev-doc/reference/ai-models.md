# AI Models Reference

## Provider Overview

| Provider | Priority | SDK | API Base URL | Env Var |
|----------|----------|-----|-------------|---------|
| Qwen (DashScope) | 0 (highest) | openai (compatible) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` |
| OpenAI GPT | 1 | openai | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
| Anthropic Claude | 2 | raw fetch | `https://api.anthropic.com` | `CLAUDE_API_KEY` |
| Google Gemini | 3 | raw fetch | `https://generativelanguage.googleapis.com` | `GEMINI_API_KEY` |

Priority: lower number = higher priority. Router tries providers in order and falls back on failure.

---

## Qwen (DashScope)

| Model ID | Default? | Use Case |
|----------|----------|----------|
| `qwen3.6-flash` | Yes (default) | General recognition, fast |
| `qwen-vl-max` | Compare default | Multi-image comparison |
| `qwen-vl-ocr-latest` | No | OCR tasks |

- DashScope is OpenAI-compatible, uses `openai` npm package
- Multi-image compare overrides default to `qwen-vl-max`

---

## OpenAI GPT

| Model ID | Default? | Use Case |
|----------|----------|----------|
| `gpt-4o` | Yes (default) | General vision + chat |
| `gpt-4o-mini` | No | Cost-effective alternative |
| `gpt-4-turbo` | No | Legacy, larger context |

---

## Anthropic Claude

| Model ID | Default? | Use Case |
|----------|----------|----------|
| `claude-3-5-sonnet-20241022` | Yes (default) | Best balance of speed + quality |
| `claude-3-opus-20240229` | No | Highest quality, slowest |
| `claude-3-haiku-20240307` | No | Fastest, cheapest |

- Uses raw `fetch()` with `x-api-key` header + `anthropic-version: 2023-06-01`
- Max tokens: 4096 (hardcoded)
- Image format: `{ type: 'image', source: { type: 'base64', media_type, data } }`

---

## Google Gemini

| Model ID | Default? | Use Case |
|----------|----------|----------|
| `gemini-2.0-flash` | Yes (default) | General vision + chat |
| `gemini-1.5-pro` | No | Highest quality |
| `gemini-1.5-flash` | No | Fast, cost-effective |

- API key passed as URL query parameter
- Endpoint: `v1beta/models/{model}:generateContent?key={apiKey}`
- `assistant` role mapped to `model` for chat messages

---

## Prompt Templates

| Template ID | Description | Default Model |
|-------------|-------------|---------------|
| `product-analysis` | Deep product teardown for Amazon home goods | (provider default) |
| `general` | General purpose recognition | (provider default) |
| `extract-title` | Extract product title from image | (provider default) |
| `extract-price` | Extract price from image | (provider default) |
| `extract-specs` | Extract specifications from image | (provider default) |
| `extract-features` | Extract feature list from image | (provider default) |
| `extract-search-keywords` | Output English Amazon search keywords | (provider default) |
| `ocr` | OCR text recognition | (provider default) |
| `listing-copy` | Listing copywriting assistance | (provider default) |
| `compare-products` | Compare multiple product images | (provider default) |

---

## Router Behavior

```
Request -> AiRouter.recognize(image, templateId)
  |
  |-> Get enabled providers (sorted by priority)
  |-> If preferred provider specified, try it first
  |-> Execute request on provider
  |-> If fails and fallback enabled, try next provider
  |-> Repeat up to maxRetries (default 3)
  |
  v
Result or Error("All providers failed")
```

---

## Architecture Status

| System | Status | Notes |
|--------|--------|-------|
| New `ai-providers/` | Implemented, not fully connected | Registry + Router + 4 providers working |
| Old `AiVisionService` | Still in active use | Used by `/api/ai/recognize` and `/api/ai/compare` |
| `GeminiFileService` | Active | Browser-based file upload to Gemini |
| `ChatGPTFileService` | Active | Browser-based file upload to ChatGPT |
| `/api/ai/optimize` | Active | Uses `GeminiFileService.chat()` directly |
