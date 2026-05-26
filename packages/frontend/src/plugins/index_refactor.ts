/**
 * ★ 节点插件定义 ★
 *
 * 【开发者：如何创建一个新节点】
 *
 * 1. 在本文件添加一个 NodePlugin 对象 (30 行代码)
 * 2. 在 src/components/Icons.tsx 注册图标
 * 3. 完成
 *
 * ── 示例：创建一个"发送邮件"节点 ──
 *
 * export const sendEmailPlugin: NodePlugin = {
 *   id: 'send-email',
 *   label: '发送邮件通知',
 *   description: '发送邮件给指定收件人',
 *   icon: 'mail',              // 需要在 Icons.tsx 中注册 'mail'
 *   category: 'data',
 *   nodeType: 'step',
 *   panelGroup: 'data',        // 出现在"数据处理"分组下
 *   panelColor: 'orange',
 *   executor: {
 *     type: 'send-email',
 *     label: '发送邮件通知',
 *     icon: 'mail',
 *     category: 'data',
 *     inputSchema: {
 *       subject: { type: 'string', label: '邮件主题' },
 *       body: { type: 'string', label: '邮件内容' },
 *     },
 *     outputSchema: {
 *       sent: { type: 'boolean', label: '发送成功' },
 *     },
 *     configSchema: {
 *       to: { type: 'string', label: '收件人', required: true },
 *     },
 *     async execute(ctx) {
 *       ctx.logger('info', `发送邮件到 ${ctx.config.to}`);
 *       await fetch('/api/send-email', { method: 'POST', body: JSON.stringify(ctx.input) });
 *       return { sent: true };
 *     },
 *   },
 * };
 *
 * 然后注册（在文件底部 plugins 数组中添加）：
 *   sendEmailPlugin,
 */
import type { NodePlugin } from "../engine/pluginTypes";
import { pluginRegistry } from "../engine/pluginRegistry";
import {
  openAmazonMock,
  extractInfoMock,
  openShopifyMock,
  fillInfoMock,
  uploadImagesMock,
  publishMock,
} from "../engine/mockExecutors";

// ──────── 流程控制节点 ──────── 流程节点控制的定义内容

export const startPlugin: NodePlugin = {
  id: "start",
  label: "开始节点",
  description: "工作流开始运行",
  icon: "play",
  category: "flow",
  nodeType: "start",
  executor: {
    type: "start",
    label: "开始节点",
    icon: "play",
    category: "flow",
    inputSchema: {},
    outputSchema: {},
    configSchema: {},
    async execute() {
      return {};
    },
  },
};

export const endPlugin: NodePlugin = {
  id: "end",
  label: "结束节点",
  description: "工作流执行完成",
  icon: "check",
  category: "flow",
  nodeType: "end",
  executor: {
    type: "end",
    label: "结束节点",
    icon: "check",
    category: "flow",
    inputSchema: {},
    outputSchema: {},
    configSchema: {},
    async execute() {
      return {};
    },
  },
};

// ──────── 业务节点 ────────

export const openAmazonPlugin: NodePlugin = {
  id: "open-amazon",
  label: "打开亚马逊商品页面",
  description: "打开指定的亚马逊商品页面",
  icon: "globe",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: openAmazonMock,
};

export const extractInfoPlugin: NodePlugin = {
  id: "extract-info",
  label: "提取商品信息",
  description: "提取标题、价格、图片、描述等信息",
  icon: "data",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: extractInfoMock,
};

export const aiOptimizePlugin: NodePlugin = {
  id: "ai-optimize",
  label: "AI 优化商品文案",
  description: "使用AI优化商品标题和描述",
  icon: "zap",
  category: "ai",
  nodeType: "step",
  panelGroup: "ai",
  panelColor: "purple",
  executor: {
    type: "ai-optimize",
    label: "AI 优化商品文案",
    icon: "zap",
    category: "ai",

    inputSchema: {
      title: { type: "string", label: "原标题" },
      description: { type: "string", label: "原描述" },
      bulletPoints: { type: "string[]", label: "五点描述（Amazon 格式）" },
      longDescription: { type: "string", label: "长描述（Amazon 格式）" },
      images: { type: "string[]", label: "商品图片（可选，用于更准确的优化）" },
      keywords: { type: "string[]", label: "竞品搜索关键词（来自西柚找词）" },
      rawKeywords: {
        type: "string",
        label: "完整关键词数据 JSON（含搜索量、难度等）",
      },
    },

    outputSchema: {
      optimizedTitle: { type: "string", label: "优化后的标题" },
      optimizedDescription: { type: "string", label: "优化后的描述" },
      optimizedBulletPoints: { type: "string[]", label: "优化后的五点描述" },
      optimizedLongDescription: { type: "string", label: "优化后的长描述" },
      seoKeywords: { type: "string[]", label: "SEO 关键词" },
      competitorAnalysis: { type: "string", label: "竞品分析总结" },
      response: { type: "string", label: "AI 完整回复" },
      chatgptTitle: { type: "string", label: "ChatGPT 优化标题" },
      chatgptDescription: { type: "string", label: "ChatGPT 优化描述" },
      chatgptKeywords: { type: "string[]", label: "ChatGPT SEO 关键词" },
      chatgptResponse: { type: "string", label: "ChatGPT 完整回复" },
    },

    configSchema: {
      // 商品信息配置（可选，优先于上游数据）
      productTitle: {
        type: "string",
        label: "商品标题（直接输入，优先级高于上游）",
      },
      productDescription: {
        type: "string",
        label: "商品描述（直接输入，优先级高于上游）",
      },
      productBulletPoints: {
        type: "string",
        label: "五点描述（每行一个，用换行分隔）",
      },
      productLongDescription: {
        type: "string",
        label: "长描述（Amazon 格式）",
      },
      // AI 配置
      executionMode: {
        type: "select",
        label: "执行模式",
        default: "gemini",
        options: [
          { label: "Gemini", value: "gemini" },
          { label: "ChatGPT", value: "chatgpt" },
          { label: "并行对比", value: "parallel" },
        ],
      },
      customPrompt: {
        type: "string",
        label: "自定义提示词（留空则使用默认模板）",
      },
      headless: {
        type: "boolean",
        label: "无头模式",
        default: true,
      },
      responseTimeout: {
        type: "number",
        label: "响应超时时间（秒）",
        default: 60,
      },
      useImage: {
        type: "boolean",
        label: "使用图片辅助优化",
        default: false,
      },
    },

    async execute(ctx) {
      // 优先级：配置 > 上游数据
      const configTitle = ctx.config.productTitle as string | undefined;
      const configDescription = ctx.config.productDescription as
        | string
        | undefined;
      const configBulletPoints = ctx.config.productBulletPoints as
        | string
        | undefined;
      const configLongDescription = ctx.config.productLongDescription as
        | string
        | undefined;

      // Original product title from gigab2b-crawl (the user's product, not competitor)
      const crawlOutput = ctx.allOutputs?.["gigab2b-crawl"] as
        | { title?: string }
        | undefined;
      const originalTitle = crawlOutput?.title;

      // Competitor title from upstream (xiyouzhaoci passthrough)
      const inputTitle = ctx.input.title as string | undefined;
      const competitorTitle = ctx.input.originalTitle ? undefined : inputTitle;

      const inputDescription = ctx.input.description as string | undefined;
      const inputBulletPoints = ctx.input.bulletPoints as string[] | undefined;
      const inputLongDescription = ctx.input.longDescription as
        | string
        | undefined;
      const images = (ctx.input.images as string[]) || [];
      const inputKeywords = (ctx.input.keywords as string[]) || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let inputRawKeywords = (ctx.input.rawKeywords as any[]) || [];

      // Fallback: scan allOutputs for xiyouzhaoci rawKeywords if not in direct input
      if (inputRawKeywords.length === 0 && ctx.allOutputs) {
        for (const output of Object.values(ctx.allOutputs)) {
          const out = output as { rawKeywords?: any[] };
          if (Array.isArray(out.rawKeywords) && out.rawKeywords.length > 0) {
            inputRawKeywords = out.rawKeywords;
            break;
          }
        }
      }

      // Title priority: config > originalTitle (gigab2b-crawl) > competitor title
      const title = configTitle || originalTitle || inputTitle;
      const description = configDescription || inputDescription;
      const bulletPointsConfig =
        configBulletPoints
          ?.split("\n")
          .map((s) => s.trim())
          .filter((s) => s) || inputBulletPoints;
      const longDescription = configLongDescription || inputLongDescription;

      ctx.logger(
        "info",
        `使用数据源: title=${configTitle ? "配置" : originalTitle ? "gigab2b-crawl" : "上游"}, description=${configDescription ? "配置" : "上游"}`,
      );
      if (originalTitle && title === originalTitle) {
        ctx.logger(
          "info",
          `使用原始产品标题: ${originalTitle.substring(0, 50)}...`,
        );
      }
      if (inputRawKeywords.length > 0) {
        ctx.logger(
          "info",
          `注入 ${inputRawKeywords.length} 个竞品关键词（含搜索量、难度等数据）`,
        );
      } else if (inputKeywords.length > 0) {
        ctx.logger("info", `注入 ${inputKeywords.length} 个竞品关键词`);
      }

      // 智能处理描述字段：优先使用 description，其次 longDescription，最后 bulletPoints
      let effectiveDescription = description;
      if (!effectiveDescription && longDescription) {
        effectiveDescription = longDescription;
        ctx.logger("info", `使用 longDescription`);
      }
      if (
        !effectiveDescription &&
        bulletPointsConfig &&
        bulletPointsConfig.length > 0
      ) {
        effectiveDescription = bulletPointsConfig.join("\n");
        ctx.logger(
          "info",
          `使用 bulletPoints (${bulletPointsConfig.length} 项)`,
        );
      }

      if (!title && !effectiveDescription) {
        ctx.logger(
          "error",
          `输入验证失败: 请在节点配置中输入商品信息，或连接上游节点`,
        );
        throw new Error(
          "请提供商品标题或描述作为输入（可以在节点配置中直接输入，或连接上游节点）",
        );
      }

      const useImage = (ctx.config.useImage as boolean) && images.length > 0;
      const headless = (ctx.config.headless as boolean) ?? true;
      const responseTimeout =
        ((ctx.config.responseTimeout as number) || 60) * 1000;
      const executionMode = (ctx.config.executionMode as string) || "gemini";

      // 构建关键词数据块（优先使用 rawKeywords 完整数据）
      let keywordBlock = "";
      if (inputRawKeywords.length > 0) {
        const topKeywords = inputRawKeywords.slice(0, 30);
        keywordBlock = `\n## 竞品搜索关键词数据（来自西柚找词）\n\n| 排名 | 关键词 | 搜索量 | 搜索趋势 | 流量占比 | 排名位置 | 难度 | 点击率 | 转化率 |\n|------|--------|--------|----------|----------|----------|------|--------|--------|\n${topKeywords.map((k: Record<string, unknown>) => `| ${k.rank || "-"} | ${k.keyword || "-"} | ${k.searchVolume || "-"} | ${k.searchVolumeTrend || "-"} | ${k.trafficShare || "-"} | ${k.rankingPosition || "-"} | ${k.difficulty || "-"} | ${k.clickRate || "-"} | ${k.conversionRate || "-"} |`).join("\n")}`;
      } else if (inputKeywords.length > 0) {
        keywordBlock = `\n## 竞品搜索关键词\n${inputKeywords
          .slice(0, 30)
          .map((k, i) => `${i + 1}. ${k}`)
          .join("\n")}`;
      }

      // ── 构建竞品 Listing 数据块 ──────────────────────────────────
      let competitorBlock = "";
      const allOutputs = ctx.allOutputs || {};
      const competitorData: Array<Record<string, unknown>> = [];

      for (const [nodeId, output] of Object.entries(allOutputs)) {
        if (nodeId.startsWith("amazon-product") && output.title) {
          competitorData.push(output);
        }
      }
      if (
        ctx.input.asin &&
        ctx.input.bulletPoints &&
        !competitorData.some((c) => c.title === ctx.input.title)
      ) {
        competitorData.push(ctx.input);
      }

      const MAX_COMPETITORS = 3;
      const topCompetitors = competitorData.slice(0, MAX_COMPETITORS);

      if (topCompetitors.length > 0) {
        const competitorSections = topCompetitors
          .map((comp, i) => {
            const compTitle = String(comp.title || "未知");
            const compBrand = comp.brand ? String(comp.brand) : "";
            const compPrice = comp.price ? `$${comp.price}` : "";
            const compRating = comp.rating ? `${comp.rating}星` : "";

            const bullets = ((comp.bulletPoints as string[]) || []).slice(0, 3);
            const bulletText =
              bullets.length > 0
                ? bullets
                    .map((b, j) => `  ${j + 1}. ${String(b).slice(0, 150)}`)
                    .join("\n")
                : "  (无)";

            const longDesc = comp.longDescription
              ? String(comp.longDescription).slice(0, 200)
              : "";

            return `### 竞品 ${i + 1}: ${compBrand ? compBrand + " — " : ""}${compTitle}
- 价格: ${compPrice || "未知"} | 评分: ${compRating || "未知"}
- 五点描述:
${bulletText}${longDesc ? `\n- 长描述摘要: ${longDesc}` : ""}`;
          })
          .join("\n\n");

        competitorBlock = `\n## 竞品 Listing 分析（Top ${topCompetitors.length}）\n\n${competitorSections}\n\n分析要点: 提取竞品共性卖点、差异化方向、关键词覆盖策略\n`;
      }

      if (topCompetitors.length > 0) {
        ctx.logger("info", `注入 ${topCompetitors.length} 个竞品 Listing 数据`);
      } else {
        ctx.logger(
          "info",
          `未检测到竞品 Listing 数据（需要 amazon-product 上游节点）`,
        );
      }

      // 构建提示词
      let prompt = ctx.config.customPrompt as string | undefined;

      if (!prompt) {
        // 默认提示词模板 — 对标竞品编写 Listing
        prompt = `你是一位资深的 Amazon 跨境电商 Listing 优化专家。请根据以下商品信息、竞品 Listing 和搜索关键词数据，为该商品编写一份对标竞品的高质量 Amazon Listing 文案。

${title ? `## 我的商品信息\n- 标题：${title}` : ""}
${competitorTitle ? `## 竞品参考标题（仅作关键词参考，非本商品标题）\n- ${competitorTitle}` : ""}
${effectiveDescription ? `- 描述：${effectiveDescription}` : ""}
${bulletPointsConfig && bulletPointsConfig.length > 0 ? `- 五点描述：\n${bulletPointsConfig.map((b, i) => `  ${i + 1}. ${b}`).join("\n")}` : ""}
${competitorBlock}
${keywordBlock}

## 输出要求

请严格按以下结构输出，总字数约 1000 字：

### 1. 商品标题（Title）
- 控制在 200 字符以内
- 优先自然融入搜索量最高的关键词
- 格式：品牌 + 核心关键词 + 材质 + 用途场景 + 差异化卖点

### 2. 五点描述（Bullet Points）
- 共 5 条，每条以大写关键词开头
- 融入搜索量高且难度适中的关键词
- 突出卖点、使用场景、材质优势、差异化特点
- 每条 80-120 字

### 3. 商品长描述（Product Description）
- 300-500 字
- 围绕核心关键词展开，自然植入长尾关键词
- 包含：产品概述 → 核心卖点 → 使用场景 → 材质优势 → 适用人群
- 使用段落分隔，层次清晰

### 4. 搜索关键词（Search Terms / Backend Keywords）
- 10-15 个关键词，逗号分隔
- 参考关键词数据中搜索量高、转化率好的词
- 不重复标题中已有的词

### 5. 竞品分析总结
- 简述该品类关键词分布特征
- 哪些关键词值得重点布局（搜索量 × 转化率高）
- 建议的定价策略参考（基于竞品关键词定位）`;
      } else {
        // 自定义提示词，追加商品信息 + 关键词数据
        if (title || effectiveDescription) {
          prompt += `\n\n## 我的商品信息\n${title ? `标题：${title}` : ""}\n${effectiveDescription ? `描述：${effectiveDescription}` : ""}`;
        }
        if (bulletPointsConfig && bulletPointsConfig.length > 0) {
          prompt += `\n五点描述：\n${bulletPointsConfig.map((b, i) => `${i + 1}. ${b}`).join("\n")}`;
        }
        if (keywordBlock) {
          prompt += `\n${keywordBlock}`;
        }
        if (competitorBlock) {
          prompt += `\n${competitorBlock}`;
        }
      }

      ctx.logger("info", `执行模式: ${executionMode}`);

      // ── API 调用函数 ──────────────────────────────────────────

      // 固定的图片路径

      // const placeholderImagePath = '/Users/clearzero22/development/ai/01_amazon_projects/node_plawright_test/quick-test/output/gigab2b-product-page.png';

      async function callGeminiAPI(
        promptText: string,
        signal: AbortSignal,
      ): Promise<{ response: string }> {
        if (
          useImage &&
          images.length > 0 &&
          images[0] &&
          !images[0].startsWith("http")
        ) {
          ctx.logger("info", `[Gemini] 使用图片优化: ${images[0]}`);
          const resp = await fetch("/api/gemini/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filePath: images[0],
              prompt: promptText,
              headless,
              responseTimeout,
            }),
            signal,
          });
          if (!resp.ok) {
            let errMsg = `HTTP ${resp.status}`;
            try {
              const err = await resp.json();
              errMsg = err.error || errMsg;
            } catch {}
            throw new Error(errMsg);
          }
          return { response: (await resp.json()).response };
        }
        ctx.logger("info", `[Gemini] 纯文本模式`);
        const resp = await fetch("/api/gemini/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: placeholderImagePath,
            prompt: promptText,
            headless,
            responseTimeout,
          }),
          signal,
        });
        if (!resp.ok) {
          let errMsg = `HTTP ${resp.status}`;
          try {
            const err = await resp.json();
            errMsg = err.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        return { response: (await resp.json()).response };
      }

      async function callChatGPTAPI(
        promptText: string,
        signal: AbortSignal,
      ): Promise<{ response: string }> {
        ctx.logger("info", `[ChatGPT] 纯文本模式`);
        const resp = await fetch("/api/chatgpt/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: placeholderImagePath,
            prompt: promptText,
            headless,
            responseTimeout,
          }),
          signal,
        });
        if (!resp.ok) {
          let errMsg = `HTTP ${resp.status}`;
          try {
            const err = await resp.json();
            errMsg = err.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        return { response: (await resp.json()).response };
      }

      // ── 解析回复 ──────────────────────────────────────────────

      function parseResponse(responseText: string): {
        optimizedTitle: string;
        optimizedDescription: string;
        seoKeywords: string[];
        optimizedBulletPoints: string[];
        optimizedLongDescription: string;
        competitorAnalysis: string;
      } {
        let optimizedTitle = title || "";
        let optimizedDescription = effectiveDescription || "";
        const seoKeywords: string[] = [];
        const optimizedBulletPoints: string[] = [];
        let optimizedLongDescription = "";
        let competitorAnalysis = "";
        const lines = responseText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);

        // 按段落分组解析
        let currentSection = "";
        for (const line of lines) {
          if (
            line.startsWith("###") ||
            line.startsWith("##") ||
            line.startsWith("#")
          ) {
            if (line.includes("标题")) currentSection = "title";
            else if (line.includes("五点")) currentSection = "bullets";
            else if (line.includes("长描述") || line.includes("描述"))
              currentSection = "description";
            else if (
              line.includes("搜索关键词") ||
              line.includes("Search Terms")
            )
              currentSection = "keywords";
            else if (line.includes("竞品分析")) currentSection = "analysis";
            else currentSection = "";
            continue;
          }

          if (line.match(/^\d+[\.\)]\s/) && currentSection === "bullets") {
            const bulletText = line.replace(/^\d+[\.\)]\s*/, "").trim();
            if (bulletText.length > 5) optimizedBulletPoints.push(bulletText);
          } else if (line.includes("标题") && line.includes("：")) {
            optimizedTitle =
              line.split("：").slice(1).join("：").trim() || optimizedTitle;
          } else if (
            line.includes("关键词") ||
            line.toLowerCase().includes("keywords")
          ) {
            if (currentSection === "keywords") {
              const keywords = line
                .split(/[，、,]/)
                .map((k) => k.trim())
                .filter((k) => k.length > 1 && !k.includes("："));
              seoKeywords.push(...keywords.slice(0, 15));
            }
          }
        }

        if (!optimizedTitle && !optimizedDescription) {
          optimizedDescription = responseText;
        }

        // 提取竞品分析（最后一个 ## 段落的内容）
        const analysisIdx = responseText.lastIndexOf("###");
        if (analysisIdx > -1) {
          competitorAnalysis = responseText.slice(analysisIdx).trim();
        }

        return {
          optimizedTitle,
          optimizedDescription,
          seoKeywords:
            seoKeywords.length > 0 ? seoKeywords : ["premium", "quality"],
          optimizedBulletPoints,
          optimizedLongDescription,
          competitorAnalysis,
        };
      }

      // ── 执行 ──────────────────────────────────────────────────

      if (executionMode === "parallel") {
        // 并行模式：同时调用 Gemini 和 ChatGPT
        ctx.logger("info", `并行调用 Gemini + ChatGPT...`);

        const [geminiResult, chatgptResult] = await Promise.allSettled([
          callGeminiAPI(prompt, ctx.abortSignal),
          callChatGPTAPI(prompt, ctx.abortSignal),
        ]);

        const geminiOk = geminiResult.status === "fulfilled";
        const chatgptOk = chatgptResult.status === "fulfilled";
        const geminiResponse = geminiOk ? geminiResult.value.response : "";
        const chatgptResponse = chatgptOk ? chatgptResult.value.response : "";

        if (!geminiOk && !chatgptOk) {
          throw new Error(
            `Gemini: ${geminiResult.reason?.message || "failed"}; ChatGPT: ${chatgptResult.reason?.message || "failed"}`,
          );
        }

        const emptyParsed = {
          optimizedTitle: "",
          optimizedDescription: "",
          seoKeywords: [] as string[],
          optimizedBulletPoints: [] as string[],
          optimizedLongDescription: "",
          competitorAnalysis: "",
        };
        const geminiParsed = geminiOk
          ? parseResponse(geminiResponse)
          : emptyParsed;
        const chatgptParsed = chatgptOk
          ? parseResponse(chatgptResponse)
          : emptyParsed;

        if (!geminiOk)
          ctx.logger("error", `Gemini 失败: ${geminiResult.reason?.message}`);
        if (!chatgptOk)
          ctx.logger("error", `ChatGPT 失败: ${chatgptResult.reason?.message}`);

        ctx.logger(
          "success",
          `并行优化完成 (Gemini: ${geminiOk ? "成功" : "失败"}, ChatGPT: ${chatgptOk ? "成功" : "失败"})`,
        );

        return {
          optimizedTitle: geminiParsed.optimizedTitle,
          optimizedDescription: geminiParsed.optimizedDescription,
          optimizedBulletPoints: geminiParsed.optimizedBulletPoints,
          optimizedLongDescription: geminiParsed.optimizedLongDescription,
          competitorAnalysis: geminiParsed.competitorAnalysis,
          seoKeywords: geminiParsed.seoKeywords,
          response: geminiResponse,
          chatgptTitle: chatgptParsed.optimizedTitle,
          chatgptDescription: chatgptParsed.optimizedDescription,
          chatgptKeywords: chatgptParsed.seoKeywords,
          chatgptResponse,
        };
      }

      if (executionMode === "chatgpt") {
        // 仅 ChatGPT
        ctx.logger("info", `使用 ChatGPT 优化文案...`);
        const chatgptResult = await callChatGPTAPI(prompt, ctx.abortSignal);
        const parsed = parseResponse(chatgptResult.response);

        ctx.logger("success", `ChatGPT 文案优化完成`);
        return {
          optimizedTitle: parsed.optimizedTitle,
          optimizedDescription: parsed.optimizedDescription,
          optimizedBulletPoints: parsed.optimizedBulletPoints,
          optimizedLongDescription: parsed.optimizedLongDescription,
          competitorAnalysis: parsed.competitorAnalysis,
          seoKeywords: parsed.seoKeywords,
          response: chatgptResult.response,
        };
      }

      // 默认：仅 Gemini
      ctx.logger(
        "info",
        useImage && images.length > 0
          ? `使用图片辅助优化文案...`
          : `使用 Gemini 优化文案...`,
      );
      const geminiResult = await callGeminiAPI(prompt, ctx.abortSignal);
      const parsed = parseResponse(geminiResult.response);

      ctx.logger("success", `Gemini 文案优化完成`);
      ctx.logger(
        "info",
        `新标题: ${parsed.optimizedTitle.substring(0, 50)}...`,
      );
      return {
        optimizedTitle: parsed.optimizedTitle,
        optimizedDescription: parsed.optimizedDescription,
        optimizedBulletPoints: parsed.optimizedBulletPoints,
        optimizedLongDescription: parsed.optimizedLongDescription,
        competitorAnalysis: parsed.competitorAnalysis,
        seoKeywords: parsed.seoKeywords,
        response: geminiResult.response,
      };
    },
  },
};

export const openShopifyPlugin: NodePlugin = {
  id: "open-shopify",
  label: "打开 Amazon 后台",
  description: "登录并打开 Amazon 后台商品创建页面",
  icon: "globe",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: openShopifyMock,
};

export const fillInfoPlugin: NodePlugin = {
  id: "fill-info",
  label: "填写商品信息",
  description: "填写优化后的商品信息",
  icon: "edit",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: fillInfoMock,
};

export const uploadImagesPlugin: NodePlugin = {
  id: "upload-images",
  label: "上传商品图片",
  description: "上传提取的商品图片到 Shopify",
  icon: "image",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: uploadImagesMock,
};

export const publishPlugin: NodePlugin = {
  id: "publish",
  label: "发布商品",
  description: "发布商品到 Shopify 店铺",
  icon: "upload",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: publishMock,
};

// ──────── 示例：自定义节点 ────────

export const sendEmailPlugin: NodePlugin = {
  id: "send-email",
  label: "发送邮件通知",
  description: "发送邮件给指定收件人",
  icon: "edit",
  category: "data",
  nodeType: "step",
  panelGroup: "data",
  panelColor: "orange",
  executor: {
    type: "send-email",
    label: "发送邮件通知",
    icon: "edit",
    category: "data",
    inputSchema: {
      recipient: { type: "string", label: "收件人" },
      subject: { type: "string", label: "邮件主题" },
    },
    outputSchema: {
      sent: { type: "boolean", label: "发送成功" },
      messageId: { type: "string", label: "消息ID" },
    },
    configSchema: {
      smtpHost: { type: "string", label: "SMTP 服务器", required: true },
      smtpPort: { type: "number", label: "端口", default: 587 },
    },
    async execute(ctx) {
      ctx.logger("info", `发送邮件到 ${ctx.config.smtpHost}`);
      await new Promise((r) => setTimeout(r, 800));
      return { sent: true, messageId: `msg_${Date.now()}` };
    },
  },
};

// ──────── AI 图片识别节点 ────────

export const aiVisionPlugin: NodePlugin = {
  id: "ai-vision",
  label: "AI 图片识别",
  description: "使用 AI 识别电商图片内容（标题、价格、规格、卖点等）",
  icon: "zap",
  category: "ai",
  nodeType: "step",
  panelGroup: "ai",
  panelColor: "purple",
  executor: {
    type: "ai-vision",
    label: "AI 图片识别",
    icon: "zap",
    category: "ai",

    inputSchema: {
      images: { type: "string[]", label: "图片链接列表" },
    },

    outputSchema: {
      results: { type: "string[]", label: "识别结果列表" },
      firstResult: { type: "string", label: "首张图片识别结果" },
      imageCount: { type: "number", label: "处理图片数量" },
      searchKeywords: { type: "string[]", label: "提取的搜索关键词" },
      keywordRawText: { type: "string", label: "关键词原始 AI 文本" },
      analyses: { type: "string[]", label: "图片分析结果列表" },
      runId: { type: "string", label: "运行 ID" },
    },

    configSchema: {
      templateId: {
        type: "select",
        label: "识别模板",
        required: true,
        options: [
          { label: "提取搜索关键词（推荐）", value: "extract-search-keywords" },
          { label: "产品深度拆解", value: "product-analysis" },
          { label: "提取商品标题", value: "extract-title" },
          { label: "提取价格", value: "extract-price" },
          { label: "提取规格参数", value: "extract-specs" },
          { label: "提取卖点", value: "extract-features" },
          { label: "生成 Listing 文案", value: "listing-copy" },
          { label: "OCR 文字提取", value: "ocr" },
          { label: "通用描述", value: "general" },
        ],
        default: "extract-search-keywords",
      },
      customPrompt: {
        type: "string",
        label: "自定义提示词（留空则使用模板）",
      },
      maxImages: {
        type: "number",
        label: "最大处理图片数",
        default: 1,
      },
    },

    async execute(ctx) {
      const images = (ctx.input.images || []) as string[];
      if (images.length === 0) {
        throw new Error("上游未提供图片数据，请先执行爬虫节点");
      }

      const customPrompt = ctx.config.customPrompt as string | undefined;
      const configTemplateId = ctx.config.templateId as string | undefined;
      const maxImages = (ctx.config.maxImages as number) || 1;
      const runId = (ctx.input.runId as string) || undefined;

      ctx.logger(
        "info",
        `共 ${images.length} 张图片，处理前 ${Math.min(images.length, maxImages)} 张`,
      );

      // AI API call helper
      async function callAI(
        image: string,
        templateId: string,
      ): Promise<string> {
        const body: Record<string, unknown> = { image };
        if (customPrompt) {
          body.prompt = customPrompt;
        } else {
          body.templateId = templateId;
        }
        if (runId) body.runId = runId;
        body.nodeId = ctx.nodeId;

        const resp = await fetch("/api/ai/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctx.abortSignal,
        });
        if (!resp.ok) {
          let errMsg = `HTTP ${resp.status}`;
          try {
            const err = await resp.json();
            errMsg = err.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        const data = await resp.json();
        return data.result as string;
      }

      // Parse keywords from AI text with multiple strategies
      function parseKeywords(text: string): string[] {
        const lines = text
          .split("\n")
          .map((l) => l.replace(/^[\d\.\-\*\s\[\]()#>]+/, "").trim())
          .filter((l) => l.length > 3 && l.length < 120);

        const englishLines = lines.filter((l) => {
          const englishChars = l.replace(/[^a-zA-Z\s\-]/g, "");
          return englishChars.length / Math.max(l.length, 1) > 0.7;
        });

        if (englishLines.length >= 2) {
          return englishLines.slice(0, 8);
        }

        return lines
          .filter(
            (l) =>
              !l.startsWith("要求") &&
              !l.startsWith("示例") &&
              !l.startsWith("注意"),
          )
          .slice(0, 8);
      }

      const templateId = configTemplateId || "extract-features";
      const toProcess = images.slice(0, maxImages);
      const isKeywordMode = templateId === "extract-search-keywords";

      // 关键词提取模式：第一张图提取关键词
      let searchKeywords: string[] = [];
      let keywordRawText = "";

      if (isKeywordMode) {
        try {
          ctx.logger("info", `提取搜索关键词（第一张图）...`);
          const keywordResult = await callAI(
            toProcess[0],
            "extract-search-keywords",
          );
          keywordRawText = keywordResult;
          searchKeywords = parseKeywords(keywordResult);
          if (searchKeywords.length === 0) {
            ctx.logger(
              "error",
              `关键词解析结果为空，原始文本: ${keywordResult.substring(0, 100)}...`,
            );
          } else {
            ctx.logger(
              "success",
              `提取 ${searchKeywords.length} 个搜索关键词: ${searchKeywords.slice(0, 3).join(", ")}...`,
            );
          }
        } catch (e) {
          ctx.logger("error", `搜索关键词提取失败: ${(e as Error).message}`);
        }
      }

      // 通用图片分析：按配置的模板处理每张图片
      // 关键词模式时跳过第一张图（已单独提取过关键词）
      const results: string[] = [];
      const analyses: string[] = [];
      const startIdx = isKeywordMode ? 1 : 0;
      for (let i = startIdx; i < toProcess.length; i++) {
        if (ctx.abortSignal.aborted) break;
        ctx.logger(
          "info",
          `分析图片 ${i + 1}/${toProcess.length} (${templateId})...`,
        );
        try {
          const result = await callAI(toProcess[i], templateId);
          results.push(result);
          analyses.push(result);
          ctx.logger("success", `图片 ${i + 1} 分析完成`);
        } catch (e) {
          const errMsg = (e as Error).message;
          ctx.logger("error", `图片 ${i + 1} 分析失败: ${errMsg}`);
          results.push(`[错误] ${errMsg}`);
        }
      }

      // 关键词模式时，把关键词文本作为 results[0]（确保 firstResult 是关键词）
      if (isKeywordMode && keywordRawText) {
        results.unshift(keywordRawText);
      }

      ctx.logger(
        "success",
        `全部完成，成功 ${analyses.length}/${toProcess.length}`,
      );

      return {
        results,
        firstResult: results[0] || keywordRawText || "",
        imageCount: results.length,
        searchKeywords,
        keywordRawText,
        analyses,
        ...(runId ? { runId } : {}),
      };
    },
  },
};

// ──────── GigaB2B 爬虫节点 ────────

export const gigab2bCrawlPlugin: NodePlugin = {
  id: "gigab2b-crawl",
  label: "GigaB2B 爬虫",
  description: "从 GigaB2B 抓取商品数据，保存到数据库",
  icon: "globe",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: {
    type: "gigab2b-crawl",
    label: "GigaB2B 爬虫",
    icon: "globe",
    category: "browser",

    inputSchema: {},

    outputSchema: {
      runId: { type: "string", label: "运行 ID" },
      externalId: { type: "string", label: "商品 ID" },
      title: { type: "string", label: "商品标题" },
      price: { type: "number", label: "价格" },
      currency: { type: "string", label: "货币" },
      description: { type: "string", label: "商品描述" },
      images: { type: "string[]", label: "图片列表" },
      specifications: { type: "object", label: "规格参数" },
    },

    configSchema: {
      productUrl: {
        type: "string",
        label: "GigaB2B 商品链接",
        required: true,
        default:
          "https://www.gigab2b.com/index.php?route=product/product&product_id=747431",
      },
      headless: {
        type: "boolean",
        label: "无头模式",
        default: true,
      },
    },

    async execute(ctx) {
      const url = ctx.config.productUrl as string;
      const headless = (ctx.config.headless as boolean) ?? true;

      ctx.logger("info", `开始抓取: ${url}`);

      const resp = await fetch("/api/crawl/gigab2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, headless }),
        signal: ctx.abortSignal,
      });

      if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
          const err = await resp.json();
          errMsg = err.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await resp.json();
      if (!data.success) {
        ctx.logger("error", `抓取失败: ${data.error || "未知错误"}`);
        throw new Error(data.error || "抓取失败");
      }
      ctx.logger("success", `抓取完成: ${data.product?.title || "未知"}`);

      // 过滤 banner 设计图，只保留商品主图
      const allImages: string[] = data.product?.images || [];
      const productImages = allImages.filter(
        (img: string) => !img.includes("bannerDesign"),
      );

      return {
        runId: data.runId,
        externalId: data.product?.externalId,
        title: data.product?.title,
        price: data.product?.price ? Number(data.product.price) : undefined,
        currency: data.product?.currency,
        description: data.product?.description,
        images: productImages,
        specifications: data.product?.specifications,
      };
    },
  },
};

// ──────── Amazon 竞品搜索节点 ────────

export const amazonSearchPlugin: NodePlugin = {
  id: "amazon-search",
  label: "Amazon 竞品搜索",
  description: "使用关键词在 Amazon 搜索竞品，获取 ASIN 列表",
  icon: "globe",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: {
    type: "amazon-search",
    label: "Amazon 竞品搜索",
    icon: "globe",
    category: "browser",

    inputSchema: {
      firstResult: { type: "string", label: "AI 识别结果（含搜索关键词）" },
      results: { type: "string[]", label: "AI 识别结果列表" },
      searchKeywords: {
        type: "string[]",
        label: "结构化搜索关键词（来自 ai-vision）",
      },
      keywordRawText: {
        type: "string",
        label: "关键词原始 AI 文本（来自 ai-vision）",
      },
    },

    outputSchema: {
      keyword: { type: "string", label: "搜索关键词" },
      asins: { type: "string[]", label: "竞品 ASIN 列表" },
      links: { type: "string[]", label: "竞品链接列表" },
      total: { type: "number", label: "找到竞品数量" },
    },

    configSchema: {
      keyword: {
        type: "string",
        label: "搜索关键词（留空则从 AI 识别结果中提取）",
      },
      maxResults: {
        type: "number",
        label: "最大结果数",
        default: 10,
      },
      useFirstLine: {
        type: "boolean",
        label: "使用 AI 结果第一行作为关键词",
        default: true,
      },
      headless: {
        type: "boolean",
        label: "无头模式",
        default: false,
      },
    },

    async execute(ctx) {
      // Priority: config keyword > searchKeywords[] > keywordRawText parse > firstResult parse > gigab2b-crawl title
      let keyword = ctx.config.keyword as string | undefined;

      // 1. Check structured searchKeywords from ai-vision
      if (!keyword) {
        const searchKeywords = ctx.input.searchKeywords as string[] | undefined;
        if (searchKeywords && searchKeywords.length > 0) {
          keyword = searchKeywords[0];
          ctx.logger("info", `使用 ai-vision 结构化关键词: ${keyword}`);
        }
      }

      // 2. Fallback: parse from keywordRawText (the actual keyword extraction result, not feature analysis)
      if (!keyword) {
        const rawText = ctx.input.keywordRawText as string | undefined;
        if (rawText) {
          const lines = rawText
            .split("\n")
            .map((l) => l.replace(/^[\d\.\-\*\s\[\]()#>]+/, "").trim())
            .filter((l) => l.length > 3 && l.length < 120);
          // Prefer English keyword lines
          const englishLines = lines.filter((l) => {
            const en = l.replace(/[^a-zA-Z\s\-]/g, "");
            return en.length / Math.max(l.length, 1) > 0.7;
          });
          keyword = (englishLines.length > 0 ? englishLines : lines)[0];
          if (keyword) {
            ctx.logger("info", `从 keywordRawText 解析关键词: ${keyword}`);
          }
        }
      }

      // 3. Fallback: parse from firstResult (extract-features text - less reliable)
      if (!keyword) {
        const aiResult = ctx.input.firstResult as string | undefined;
        if (aiResult) {
          if (ctx.config.useFirstLine) {
            keyword = aiResult
              .split("\n")
              .map((l) => l.replace(/^[\d\.\-\*\s]+/, "").trim())
              .find((l) => l.length > 3);
          }
          if (!keyword)
            keyword = aiResult
              .split("\n")[0]
              ?.replace(/^[\d\.\-\*\s]+/, "")
              .trim();
        }
      }

      // 4. Final fallback: gigab2b-crawl product title
      if (!keyword) {
        const crawlOutput = ctx.allOutputs?.["gigab2b-crawl"] as
          | { title?: string }
          | undefined;
        if (crawlOutput?.title) {
          keyword = crawlOutput.title;
          ctx.logger(
            "info",
            `使用 gigab2b-crawl 原始标题作为关键词: ${keyword}`,
          );
        }
      }

      if (!keyword) {
        throw new Error(
          "未提供搜索关键词：请在节点配置中填写，或确保上游 AI 识别节点输出了关键词",
        );
      }

      const maxResults = (ctx.config.maxResults as number) || 10;
      ctx.logger("info", `搜索关键词: ${keyword}`);

      const resp = await fetch("/api/search/amazon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          maxResults,
          headless: ctx.config.headless,
        }),
        signal: ctx.abortSignal,
      });

      if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
          const err = await resp.json();
          errMsg = err.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await resp.json();
      if (!data.success) {
        ctx.logger("error", `搜索失败: ${data.error || "未知错误"}`);
        throw new Error(data.error || "搜索失败");
      }
      ctx.logger("success", `找到 ${data.total} 个竞品`);

      return {
        keyword: data.keyword,
        asins: data.asins,
        links: data.links,
        total: data.total,
      };
    },
  },
};

// ──────── Amazon 商品详情节点 ────────

export const amazonProductPlugin: NodePlugin = {
  id: "amazon-product",
  label: "Amazon 商品详情",
  description:
    "抓取 Amazon 商品完整详情（标题、价格、品牌、规格参数、五点描述等）",
  icon: "data",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: {
    type: "amazon-product",
    label: "Amazon 商品详情",
    icon: "data",
    category: "browser",

    inputSchema: {
      asins: {
        type: "string[]",
        label: "上游 ASIN 列表（来自 Amazon 竞品搜索）",
      },
      links: {
        type: "string[]",
        label: "上游链接列表（来自 Amazon 竞品搜索）",
      },
    },

    outputSchema: {
      asin: { type: "string", label: "商品 ASIN" },
      title: { type: "string", label: "商品标题" },
      brand: { type: "string", label: "品牌" },
      price: { type: "string", label: "价格" },
      rating: { type: "string", label: "评分" },
      bulletPoints: { type: "string[]", label: "五点描述列表" },
      longDescription: { type: "string", label: "长描述" },
      images: { type: "string[]", label: "商品图片列表" },
      specifications: { type: "string[]", label: "规格参数列表" },
      bestSellersRank: { type: "string[]", label: "销售排名" },
    },

    configSchema: {
      asin: {
        type: "string",
        label: "ASIN（手动输入，优先级高于上游数据）",
      },
      productUrl: {
        type: "string",
        label: "商品链接（手动输入）",
      },
      headless: {
        type: "boolean",
        label: "无头模式",
        default: true,
      },
      saveToDb: {
        type: "boolean",
        label: "保存到数据库",
        default: true,
      },
    },

    async execute(ctx) {
      // Priority: config.asin > config.productUrl > upstream asins[0] > upstream links[0]
      let asin = ctx.config.asin as string | undefined;
      let url = ctx.config.productUrl as string | undefined;

      if (!asin && !url) {
        const upstreamAsins = ctx.input.asins as string[] | undefined;
        const upstreamLinks = ctx.input.links as string[] | undefined;
        if (upstreamAsins && upstreamAsins.length > 0) {
          asin = upstreamAsins[0];
        } else if (upstreamLinks && upstreamLinks.length > 0) {
          url = upstreamLinks[0];
        }
      }

      if (!asin && !url) {
        throw new Error(
          "未提供 ASIN 或商品链接：请在节点配置中填写，或确保上游搜索节点已执行",
        );
      }

      const source = asin ? `ASIN: ${asin}` : url!;
      ctx.logger("info", `开始抓取: ${source}`);

      const body: Record<string, unknown> = {
        headless: ctx.config.headless ?? true,
        saveToDb: ctx.config.saveToDb !== false,
      };
      if (asin) body.asin = asin;
      if (url) body.url = url;

      const resp = await fetch("/api/scrape/amazon-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctx.abortSignal,
      });

      if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
          const err = await resp.json();
          errMsg = err.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await resp.json();
      if (!data.success) {
        ctx.logger("error", `抓取失败: ${data.error || "未知错误"}`);
        throw new Error(data.error || "抓取失败");
      }
      const product = data.product;
      ctx.logger(
        "success",
        `抓取完成: ${product?.title?.slice(0, 50) || "未知"}`,
      );

      return {
        asin: product.asin,
        title: product.title,
        brand: product.brand,
        price: product.price,
        rating: product.rating,
        bulletPoints: product.bulletPoints || [],
        longDescription: product.longDescription || "",
        images: product.images || [],
        specifications: Object.entries(product.specifications || {}).map(
          ([k, v]) => `${k}: ${v}`,
        ),
        bestSellersRank: product.bestSellersRank || [],
      };
    },
  },
};

export const viewRunsPlugin: NodePlugin = {
  id: "view-runs",
  label: "查看运行记录",
  description: "查看所有爬虫运行历史",
  icon: "data",
  category: "data",
  nodeType: "step",
  panelGroup: "data",
  panelColor: "orange",
  executor: {
    type: "view-runs",
    label: "查看运行记录",
    icon: "data",
    category: "data",
    inputSchema: {},
    outputSchema: {
      runs: { type: "string[]", label: "运行记录列表" },
      total: { type: "number", label: "总数" },
    },
    configSchema: {
      limit: {
        type: "number",
        label: "显示条数",
        default: 10,
      },
    },
    async execute(ctx) {
      const limit = (ctx.config.limit as number) ?? 10;
      ctx.logger("info", `查询最近 ${limit} 条运行记录`);
      const resp = await fetch(`/api/runs?limit=${limit}`, {
        signal: ctx.abortSignal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      ctx.logger("success", `找到 ${data.total} 条记录`);
      return {
        runs: (data.runs || []).map(
          (r: any) =>
            `${r.runId.slice(-12)} | ${r.status} | ${r.itemsScraped} items | ${r.source}`,
        ),
        total: data.total,
      };
    },
  },
};

// ──────── 西柚找词关键词挖掘节点 ────────

export const xiyouzhaociPlugin: NodePlugin = {
  id: "xiyouzhaoci-keywords",
  label: "西柚找词 - 关键词挖掘",
  description:
    "从西柚找词抓取 Amazon 商品关键词数据（搜索量、竞争度、流量份额等）",
  icon: "search",
  category: "browser",
  nodeType: "step",
  panelGroup: "browser",
  panelColor: "blue",
  executor: {
    type: "xiyouzhaoci-keywords",
    label: "西柚找词 - 关键词挖掘",
    icon: "search",
    category: "browser",

    inputSchema: {
      asin: { type: "string", label: "上游 ASIN（来自 Amazon 商品详情）" },
    },

    outputSchema: {
      asin: { type: "string", label: "商品 ASIN" },
      keywords: { type: "string[]", label: "关键词列表" },
      totalKeywords: { type: "number", label: "总关键词数" },
      topKeyword: { type: "string", label: "Top 1 关键词" },
      csvPath: { type: "string", label: "CSV 备份路径" },
      rawKeywords: {
        type: "string",
        label: "完整关键词数据 JSON（含搜索量、难度等）",
      },
      // 透传上游竞品数据
      title: { type: "string", label: "竞品标题（透传）" },
      originalTitle: {
        type: "string",
        label: "原始产品标题（来自 gigab2b-crawl）",
      },
      brand: { type: "string", label: "竞品品牌（透传）" },
      price: { type: "string", label: "竞品价格（透传）" },
      bulletPoints: { type: "string[]", label: "竞品五点描述（透传）" },
      longDescription: { type: "string", label: "竞品长描述（透传）" },
    },

    configSchema: {
      defaultAsin: {
        type: "string",
        label: "默认 ASIN（无上游时使用）",
        default: "B08F5M1K9M",
      },
      asin: {
        type: "string",
        label: "ASIN（手动输入，优先级高于默认值和上游）",
      },
      headless: {
        type: "boolean",
        label: "无头模式",
        default: true,
      },
      maxKeywords: {
        type: "number",
        label: "最大关键词数",
        default: 50,
      },
    },

    async execute(ctx) {
      // 优先级：手动输入 > 上游数据 > 默认值
      let asin = ctx.config.asin as string | undefined;

      // 如果没有手动输入，尝试从上游获取
      if (!asin) {
        asin = ctx.input.asin as string | undefined;
      }

      // 如果既没有手动输入也没有上游数据，使用默认值
      if (!asin) {
        asin = (ctx.config.defaultAsin as string) || "B08F5M1K9M";
        ctx.logger("info", `使用默认 ASIN: ${asin}`);
      }

      if (!asin) {
        throw new Error(
          "未提供 ASIN：请在节点配置中填写，或连接上游 Amazon 商品详情节点",
        );
      }

      ctx.logger("info", `开始抓取西柚找词: ${asin}`);

      // 直接调用统一 API 服务器（通过 Vite proxy）
      const resp = await fetch("/api/keywords/xiyouzhaoci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin,
          headless: ctx.config.headless ?? true,
          maxKeywords: ctx.config.maxKeywords ?? 50,
        }),
        signal: ctx.abortSignal,
      });

      if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
          const err = await resp.json();
          errMsg = err.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await resp.json();
      ctx.logger("success", `抓取完成: ${data.totalKeywords} 个关键词`);

      return {
        asin: data.asin,
        keywords: data.keywords.map((k: any) => k.keyword),
        totalKeywords: data.totalKeywords,
        topKeyword: data.keywords[0]?.keyword || "",
        csvPath: data.csvPath,
        rawKeywords: data.keywords,
        // 透传上游竞品数据给下游 ai-optimize 使用
        title: ctx.input.title as string | undefined,
        brand: ctx.input.brand as string | undefined,
        price: ctx.input.price as string | undefined,
        bulletPoints: ctx.input.bulletPoints as string[] | undefined,
        longDescription: ctx.input.longDescription as string | undefined,
        // 透传原始产品标题（来自 gigab2b-crawl）
        originalTitle: (
          ctx.allOutputs?.["gigab2b-crawl"] as { title?: string } | undefined
        )?.title,
      };
    },
  },
};

// ──────── HTTP请求节点 ────────

export const httpRequestPlugin: NodePlugin = {
  id: "http-request",
  label: "HTTP请求",
  description: "发送HTTP请求到指定URL,支持GET/POST等方法",
  icon: "globe",
  category: "data",
  nodeType: "step",
  panelGroup: "data",
  panelColor: "orange",

  executor: {
    type: "http-request",
    label: "HTTP请求",
    icon: "globe",
    category: "data",

    inputSchema: {
      body: { type: "string", label: "请求体(JSON)" },
      params: { type: "object", label: "URL参数对象" },
    },

    outputSchema: {
      status: { type: "number", label: "HTTP状态码" },
      data: { type: "object", label: "响应数据" },
      headers: { type: "object", label: "响应头" },
    },

    configSchema: {
      url: {
        type: "string",
        label: "请求URL",
        required: true,
      },
      method: {
        type: "select",
        label: "请求方法",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "DELETE", value: "DELETE" },
          { label: "PATCH", value: "PATCH" },
        ],
        default: "POST",
      },
      headers: {
        type: "string",
        label: "请求头(JSON格式)",
        default: '{"Content-Type": "application/json"}',
      },
      timeout: {
        type: "number",
        label: "超时时间(秒)",
        default: 30,
      },
      followRedirect: {
        type: "boolean",
        label: "跟随重定向",
        default: false,
      },
    },

    async execute(ctx) {
      const url = ctx.config.url as string;
      const method = ctx.config.method as string;
      const headersStr = ctx.config.headers as string;
      const timeout = ((ctx.config.timeout as number) || 30) * 1000;
      const followRedirect = ctx.config.followRedirect as boolean;

      ctx.logger("info", `发送 ${method} 请求到: ${url}`);

      // 解析请求头
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(headersStr);
      } catch {
        headers = { "Content-Type": "application/json" };
      }

      // 准备请求选项
      const options: RequestInit = {
        method,
        headers,
        signal: ctx.abortSignal,
        redirect: followRedirect ? "manual" : "manual",
      };

      // 添加请求体
      if (method !== "GET" && method !== "HEAD") {
        const body = ctx.input.body as string;
        if (body) {
          options.body = body;
        }
      }

      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const startTime = Date.now();
        const response = await fetch(url, {
          ...options,
          signal: ctx.abortSignal || controller.signal,
        });

        clearTimeout(timeoutId);

        // 获取响应数据
        const data = await response.json().catch(() => ({}));
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const duration = Date.now() - startTime;

        ctx.logger("success", `请求成功: ${response.status} (${duration}ms)`);

        return {
          status: response.status,
          data: data,
          headers: responseHeaders,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
          ctx.logger("error", `请求超时(${timeout}ms)`);
          throw new Error(`请求超时: ${timeout}ms`);
        }

        ctx.logger("error", `请求失败: ${error.message}`);
        throw error;
      }
    },
  },
};

// ──────── 注册顺序 = Canvas 上节点从上到下显示顺序 ────────

export const plugins: NodePlugin[] = [
  startPlugin,
  gigab2bCrawlPlugin,
  aiVisionPlugin,
  amazonSearchPlugin,
  amazonProductPlugin,
  xiyouzhaociPlugin,
  extractInfoPlugin,
  aiOptimizePlugin,
  viewRunsPlugin,
  httpRequestPlugin,
  openShopifyPlugin,
  fillInfoPlugin,
  uploadImagesPlugin,
  publishPlugin,
  sendEmailPlugin,
  endPlugin,
];

// ★ 自动注册到全局注册表
pluginRegistry.registerAll(plugins);
