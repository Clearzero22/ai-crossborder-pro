/**
 * Services 测试运行器 - 简化版
 * 直接运行所有测试文件
 */

import * as path from 'path';

// 全局测试工具
(globalThis as any).assert = {
  equal: (actual: unknown, expected: unknown, message?: string) => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, but got ${actual}`);
    }
  },

  notEqual: (actual: unknown, expected: unknown, message?: string) => {
    if (actual === expected) {
      throw new Error(message || `Expected not ${expected}, but got ${actual}`);
    }
  },

  deepEqual: (actual: unknown, expected: unknown, message?: string) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(message || `Expected ${expectedStr}, but got ${actualStr}`);
    }
  },

  isNull: (value: unknown, message?: string) => {
    if (value !== null) {
      throw new Error(message || `Expected null, but got ${value}`);
    }
  },

  isNotNull: (value: unknown, message?: string) => {
    if (value === null) {
      throw new Error(message || `Expected not null, but got null`);
    }
  },

  isTrue: (value: unknown, message?: string) => {
    if (value !== true) {
      throw new Error(message || `Expected true, but got ${value}`);
    }
  },

  isFalse: (value: unknown, message?: string) => {
    if (value !== false) {
      throw new Error(message || `Expected false, but got ${value}`);
    }
  },

  isDefined: (value: unknown, message?: string) => {
    if (value === undefined) {
      throw new Error(message || `Expected defined, but got undefined`);
    }
  },

  isUndefined: (value: unknown, message?: string) => {
    if (value !== undefined) {
      throw new Error(message || `Expected undefined, but got ${value}`);
    }
  },

  isArray: (value: unknown, message?: string) => {
    if (!Array.isArray(value)) {
      throw new Error(message || `Expected array, but got ${typeof value}`);
    }
  },

  isEmpty: (value: unknown, message?: string) => {
    const isEmpty = value === null || value === undefined || value === '' ||
                    (Array.isArray(value) && value.length === 0) ||
                    (typeof value === 'object' && Object.keys(value).length === 0);
    if (!isEmpty) {
      throw new Error(message || `Expected empty, but got ${JSON.stringify(value)}`);
    }
  },

  isNotEmpty: (value: unknown, message?: string) => {
    const isEmpty = value === null || value === undefined || value === '' ||
                    (Array.isArray(value) && value.length === 0) ||
                    (typeof value === 'object' && Object.keys(value).length === 0);
    if (isEmpty) {
      throw new Error(message || `Expected not empty`);
    }
  },

  throws: async (fn: () => Promise<void> | void, message?: string) => {
    try {
      await fn();
      throw new Error(message || 'Expected function to throw, but it did not');
    } catch (error) {
      if ((error as Error).message === 'Expected function to throw') {
        throw error;
      }
    }
  },

  match: (value: string, pattern: RegExp | string, message?: string) => {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    if (!regex.test(value)) {
      throw new Error(message || `Value does not match pattern: ${value}`);
    }
  },

  fail: (message?: string) => {
    throw new Error(message || 'Test failed');
  },
};

(globalThis as any).sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 测试结果跟踪
const testResults = {
  amazonSearch: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  amazonProduct: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  aiVision: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  crawler: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  xiyouzhaoci: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  amazonSearchCDP: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  chatgptFile: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
  geminiFile: { passed: 0, failed: 0, total: 0, errors: [] as string[] },
};

// 运行单个测试
async function runTest(testName: string, testFn: () => Promise<void>): Promise<boolean> {
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`  ✅ ${testName} [${duration}ms]`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ ${testName}`);
    console.log(`     Error: ${errorMessage}`);
    return false;
  }
}

// 测试注册
const testSuites: Record<string, Array<{ name: string; fn: () => Promise<void> }>[]> = {};

(globalThis as any).beforeEach = (fn: () => Promise<void> | void) => {
  // 简化实现，暂不使用
};

(globalThis as any).afterEach = (fn: () => Promise<void> | void) => {
  // 简化实现，暂不使用
};

(globalThis as any).describe = (name: string, fn: () => void) => {
  const tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  const originalTest = (globalThis as any).test;
  (globalThis as any).test = (testName: string, testFn: () => Promise<void>) => {
    tests.push({ name: testName, fn: testFn });
  };

  try {
    fn();
  } catch (error) {
    console.error(`描述块 ${name} 执行失败:`, error);
  }

  testSuites[name] = tests;
  (globalThis as any).test = originalTest;
};

// 主测试运行函数
async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('开始执行 Services 测试...');
  console.log('='.repeat(70) + '\n');

  const startTime = Date.now();

  // 1. AmazonSearchService 测试
  console.log('测试服务: AmazonSearchService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/amazon-search.test.ts');

    if (testSuites['AmazonSearchService']) {
      const suite = testSuites['AmazonSearchService'];
      testResults.amazonSearch.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.amazonSearch.passed++;
        } else {
          testResults.amazonSearch.failed++;
          testResults.amazonSearch.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ AmazonSearchService 测试加载失败:', error);
    testResults.amazonSearch.failed++;
  }

  await sleep(2000);

  // 2. AmazonProductService 测试
  console.log('\n测试服务: AmazonProductService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/amazon-product.test.ts');

    if (testSuites['AmazonProductService']) {
      const suite = testSuites['AmazonProductService'];
      testResults.amazonProduct.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.amazonProduct.passed++;
        } else {
          testResults.amazonProduct.failed++;
          testResults.amazonProduct.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ AmazonProductService 测试加载失败:', error);
    testResults.amazonProduct.failed++;
  }

  await sleep(2000);

  // 3. AIVisionService 测试
  console.log('\n测试服务: AIVisionService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/ai-vision.test.ts');

    if (testSuites['AIVisionService']) {
      const suite = testSuites['AIVisionService'];
      testResults.aiVision.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.aiVision.passed++;
        } else {
          testResults.aiVision.failed++;
          testResults.aiVision.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ AIVisionService 测试加载失败:', error);
    testResults.aiVision.failed++;
  }

  await sleep(2000);

  // 4. CrawlerService 测试
  console.log('\n测试服务: CrawlerService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/crawler.test.ts');

    if (testSuites['CrawlerService']) {
      const suite = testSuites['CrawlerService'];
      testResults.crawler.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.crawler.passed++;
        } else {
          testResults.crawler.failed++;
          testResults.crawler.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ CrawlerService 测试加载失败:', error);
    testResults.crawler.failed++;
  }

  await sleep(2000);

  // 5. XiyouzhaociService 测试
  console.log('\n测试服务: XiyouzhaociService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/xiyouzhaoci.test.ts');

    if (testSuites['XiyouzhaociService']) {
      const suite = testSuites['XiyouzhaociService'];
      testResults.xiyouzhaoci.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.xiyouzhaoci.passed++;
        } else {
          testResults.xiyouzhaoci.failed++;
          testResults.xiyouzhaoci.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ XiyouzhaociService 测试加载失败:', error);
    testResults.xiyouzhaoci.failed++;
  }

  await sleep(2000);

  // 6. AmazonSearchServiceCDP 测试
  console.log('\n测试服务: AmazonSearchServiceCDP');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/amazon-search-cdp.test.ts');

    if (testSuites['AmazonSearchServiceCDP']) {
      const suite = testSuites['AmazonSearchServiceCDP'];
      testResults.amazonSearchCDP.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.amazonSearchCDP.passed++;
        } else {
          testResults.amazonSearchCDP.failed++;
          testResults.amazonSearchCDP.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ AmazonSearchServiceCDP 测试加载失败:', error);
    testResults.amazonSearchCDP.failed++;
  }

  await sleep(2000);

  // 7. ChatGPTFileService 测试
  console.log('\n测试服务: ChatGPTFileService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/chatgpt-file.test.ts');

    if (testSuites['ChatGPTFileService']) {
      const suite = testSuites['ChatGPTFileService'];
      testResults.chatgptFile.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.chatgptFile.passed++;
        } else {
          testResults.chatgptFile.failed++;
          testResults.chatgptFile.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ ChatGPTFileService 测试加载失败:', error);
    testResults.chatgptFile.failed++;
  }

  await sleep(2000);

  // 8. GeminiFileService 测试
  console.log('\n测试服务: GeminiFileService');
  console.log('-'.repeat(50));
  try {
    await import('./src/services/__tests__/gemini-file.test.ts');

    if (testSuites['GeminiFileService']) {
      const suite = testSuites['GeminiFileService'];
      testResults.geminiFile.total = suite.length;

      for (const test of suite) {
        const passed = await runTest(test.name, test.fn);
        if (passed) {
          testResults.geminiFile.passed++;
        } else {
          testResults.geminiFile.failed++;
          testResults.geminiFile.errors.push(test.name);
        }
      }
    }
  } catch (error) {
    console.error('❌ GeminiFileService 测试加载失败:', error);
    testResults.geminiFile.failed++;
  }

  // 生成测试报告
  const totalDuration = Date.now() - startTime;
  const totalPassed = Object.values(testResults).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = Object.values(testResults).reduce((sum, r) => sum + r.total, 0);

  console.log('\n' + '='.repeat(70));
  console.log('Services 测试报告');
  console.log('='.repeat(70));

  const services = [
    { name: 'AmazonSearchService', ...testResults.amazonSearch },
    { name: 'AmazonProductService', ...testResults.amazonProduct },
    { name: 'AIVisionService', ...testResults.aiVision },
    { name: 'CrawlerService', ...testResults.crawler },
    { name: 'XiyouzhaociService', ...testResults.xiyouzhaoci },
    { name: 'AmazonSearchServiceCDP', ...testResults.amazonSearchCDP },
    { name: 'ChatGPTFileService', ...testResults.chatgptFile },
    { name: 'GeminiFileService', ...testResults.geminiFile },
  ];

  services.forEach(service => {
    const status = service.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${service.name} - ${service.passed}/${service.total} tests passed`);

    if (service.errors.length > 0) {
      service.errors.forEach(error => {
        console.log(`  ❌ ${error}`);
      });
    }
  });

  console.log('\n' + '-'.repeat(70));
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';
  console.log(`总计: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
  if (totalFailed > 0) {
    console.log(`失败: ${totalFailed} tests`);
  }
  console.log(`执行时间: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('='.repeat(70) + '\n');

  // 返回退出码
  if (totalFailed > 0) {
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});