/**
 * Services 测试运行器
 * 系统化测试所有 backend services
 */

import * as path from 'path';
import * as fs from 'fs';

// 测试结果接口
interface TestResult {
  serviceName: string;
  testFile: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  errors: string[];
}

interface TestSuite {
  name: string;
  tests: TestFunction[];
}

type TestFunction = () => Promise<void>;

// 测试套件注册表
const testSuites = new Map<string, TestFunction[]>();

// 全局测试配置
const testConfig = {
  timeout: 60000,
  verbose: true,
  headless: true,
};

// 测试工具函数
export const assert = {
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
      // Function threw as expected
    }
  },

  match: (value: string, pattern: RegExp | string, message?: string) => {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    if (!regex.test(value)) {
      throw new Error(message || `Value does not match pattern: ${value}`);
    }
  },
};

// 测试套件注册
export function describe(name: string, fn: () => void) {
  const tests: TestFunction[] = [];
  const currentTests = tests;

  (globalThis as any).__currentTests = currentTests;
  fn();
  delete (globalThis as any).__currentTests;

  testSuites.set(name, {
    name,
    tests,
  });
}

// 测试用例注册
export function test(name: string, fn: TestFunction) {
  const currentTests = (globalThis as any).__currentTests;
  if (currentTests) {
    currentTests.push(fn);
  } else {
    throw new Error('test() must be called inside describe()');
  }
}

// 异步等待
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成测试报告
function generateReport(results: TestResult[]): string {
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  let report = '\n' + '='.repeat(70) + '\n';
  report += 'Services 测试报告\n';
  report += '='.repeat(70) + '\n\n';

  results.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    report += `${status} ${result.serviceName} - ${result.passed}/${result.total} tests passed`;

    if (result.failed > 0) {
      report += ` (${result.failed} failed)`;
    }
    report += ` [${result.duration}ms]\n`;

    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        report += `  ❌ ${error}\n`;
      });
    }
  });

  report += '\n' + '-'.repeat(70) + '\n';
  report += `总计: ${totalPassed}/${totalTests} tests passed`;
  if (totalFailed > 0) {
    report += ` (${totalFailed} failed)`;
  }
  report += ` [${(totalDuration / 1000).toFixed(2)}s]\n`;
  report += '='.repeat(70) + '\n';

  return report;
}

// 动态加载测试文件
async function loadTestFiles() {
  const testsDir = path.join(__dirname, 'src/services/__tests__');

  if (!fs.existsSync(testsDir)) {
    console.warn(`测试目录不存在: ${testsDir}`);
    return;
  }

  const testFiles = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'))
    .map(file => path.join(testsDir, file));

  for (const testFile of testFiles) {
    try {
      console.log(`加载测试文件: ${path.basename(testFile)}`);
      await import(testFile);
    } catch (error) {
      console.error(`加载测试文件失败: ${testFile}`, error);
    }
  }
}

// 运行所有测试
export async function runAllTests(): Promise<void> {
  console.log('开始执行 Services 测试...\n');

  const startTime = Date.now();

  // 加载测试文件
  await loadTestFiles();

  const results: TestResult[] = [];

  for (const [serviceName, suite] of testSuites) {
    const testFile = `${serviceName}.test.ts`;
    const serviceResults: TestResult = {
      serviceName,
      testFile,
      passed: 0,
      failed: 0,
      total: suite.tests.length,
      duration: 0,
      errors: [],
    };

    console.log(`\n测试服务: ${serviceName}`);
    console.log('='.repeat(50));

    const suiteStartTime = Date.now();

    for (let i = 0; i < suite.tests.length; i++) {
      const testFn = suite.tests[i];
      const testName = `Test ${i + 1}`;

      try {
        const testStartTime = Date.now();
        await Promise.race([
          testFn(),
          sleep(testConfig.timeout).then(() => {
            throw new Error(`测试超时 (${testConfig.timeout}ms)`);
          }),
        ]);
        const testDuration = Date.now() - testStartTime;
        serviceResults.passed++;
        console.log(`  ✅ ${testName} [${testDuration}ms]`);
      } catch (error) {
        serviceResults.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        serviceResults.errors.push(`${testName}: ${errorMessage}`);
        console.log(`  ❌ ${testName}`);
        console.log(`     Error: ${errorMessage}`);
      }
    }

    serviceResults.duration = Date.now() - suiteStartTime;
    results.push(serviceResults);
  }

  const totalDuration = Date.now() - startTime;

  // 生成并输出报告
  const report = generateReport(results);
  console.log(report);

  // 保存报告到文件
  const reportPath = path.join(__dirname, 'test-report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`测试报告已保存到: ${reportPath}`);

  // 如果有失败测试，退出码为 1
  if (results.some(r => r.failed > 0)) {
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

// 导出全局函数到全局作用域
(globalThis as any).describe = describe;
(globalThis as any).test = test;
(globalThis as any).assert = assert;
(globalThis as any).sleep = sleep;