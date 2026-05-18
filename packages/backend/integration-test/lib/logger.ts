const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncate(obj: unknown, maxLen = 300): string {
  const s = JSON.stringify(obj, null, 2) || String(obj);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '\n  ... (truncated)';
}

export function divider() {
  console.log(`\n${'═'.repeat(57)}`);
}

export function stepStart(stepNum: number, name: string) {
  console.log(`\n── Step ${stepNum}/6: ${name} ${'─'.repeat(Math.max(1, 30 - name.length))}`);
}

export function stepSuccess(stepNum: number, name: string, durationMs: number) {
  console.log(`  ${COLORS.green}✅ Success${COLORS.reset} ${COLORS.dim}(${formatDuration(durationMs)})${COLORS.reset} ${COLORS.gray}[${timestamp()}]${COLORS.reset}`);
}

export function stepError(stepNum: number, name: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(`  ${COLORS.red}❌ Failed${COLORS.reset} ${COLORS.gray}[${timestamp()}]${COLORS.reset}`);
  console.log(`  ${COLORS.red}   ${msg}${COLORS.reset}`);
}

export function stepSkipped(stepNum: number, name: string, reason: string) {
  console.log(`  ${COLORS.yellow}⏭️  Skipped${COLORS.reset} — ${reason}`);
}

export function dataSnapshot(label: string, data: unknown) {
  console.log(`  ${COLORS.cyan}📊 ${label}:${COLORS.reset}`);
  console.log(`  ${COLORS.dim}${truncate(data)}${COLORS.reset}`);
}

export function info(msg: string) {
  console.log(`  ${COLORS.dim}${msg}${COLORS.reset}`);
}

export function header(options: { mock: boolean; headless: boolean; skipTo: number }) {
  divider();
  console.log(`  🚀 AI Crossborder Pro — Integration Test Pipeline`);
  console.log(`  Mode: ${options.mock ? 'mock' : 'real-crawl'} | Headless: ${options.headless} | Skip to: ${options.skipTo || 'none'}`);
  divider();
}

export function summary(passed: number, failed: number, skipped: number, totalMs: number) {
  divider();
  console.log(`  Pipeline Complete`);
  console.log(`  Steps: ${COLORS.green}${passed} passed${COLORS.reset} / ${COLORS.red}${failed} failed${COLORS.reset} / ${COLORS.yellow}${skipped} skipped${COLORS.reset}`);
  console.log(`  Total time: ${COLORS.bold}${formatDuration(totalMs)}${COLORS.reset}`);
  divider();
}
