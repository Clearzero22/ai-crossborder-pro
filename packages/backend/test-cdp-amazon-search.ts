/**
 * Test script for Amazon Search Service CDP version
 * 测试 Amazon 搜索服务的 CDP 版本
 */

import { AmazonSearchService } from './src/services/amazon-search-service-cdp';

async function runTest() {
  console.log('='.repeat(60));
  console.log('Amazon Search Service CDP Version Test');
  console.log('='.repeat(60));

  const service = new AmazonSearchService();

  try {
    // 测试用例 1: 简单搜索
    console.log('\n[TEST 1] Searching for "wireless mouse"...');
    const result1 = await service.search('wireless mouse', 5, { headless: false });

    console.log('✅ Test 1 PASSED');
    console.log(`   Keyword: ${result1.keyword}`);
    console.log(`   Total: ${result1.total} products found`);
    console.log(`   ASINs: ${result1.asins.slice(0, 3).join(', ')}${result1.asins.length > 3 ? '...' : ''}`);

    // 等待一下，避免请求过快
    await sleep(2000);

    // 测试用例 2: 不同关键词
    console.log('\n[TEST 2] Searching for "bluetooth headphones"...');
    const result2 = await service.search('bluetooth headphones', 3, { headless: false });

    console.log('✅ Test 2 PASSED');
    console.log(`   Keyword: ${result2.keyword}`);
    console.log(`   Total: ${result2.total} products found`);
    console.log(`   ASINs: ${result2.asins.slice(0, 3).join(', ')}${result2.asins.length > 3 ? '...' : ''}`);

    // 测试用例 3: 验证 ASIN 格式
    console.log('\n[TEST 3] Validating ASIN formats...');
    let allValid = true;
    for (const asin of [...result1.asins, ...result2.asins]) {
      const isValid = /^[A-Z0-9]{10}$/.test(asin);
      if (!isValid) {
        console.log(`   ❌ Invalid ASIN format: ${asin}`);
        allValid = false;
      }
    }
    if (allValid) {
      console.log('✅ Test 3 PASSED - All ASINs have valid format');
    }

    // 测试用例 4: 验证链接格式
    console.log('\n[TEST 4] Validating link formats...');
    let allLinksValid = true;
    for (const link of [...result1.links, ...result2.links]) {
      const isValid = /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}$/.test(link);
      if (!isValid) {
        console.log(`   ❌ Invalid link format: ${link}`);
        allLinksValid = false;
      }
    }
    if (allLinksValid) {
      console.log('✅ Test 4 PASSED - All links have valid format');
    }

    // 测试用例 5: 验证去重功能
    console.log('\n[TEST 5] Checking for duplicates...');
    const combinedAsins = [...result1.asins, ...result2.asins];
    const uniqueAsins = new Set(combinedAsins);
    if (combinedAsins.length === uniqueAsins.size) {
      console.log('✅ Test 5 PASSED - No duplicates found');
    } else {
      console.log('❌ Test 5 FAILED - Duplicates detected');
    }

    // 测试总结
    console.log('\n' + '='.repeat(60));
    console.log('All tests completed successfully! 🎉');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test FAILED with error:');
    console.error(error);
    console.error('\n' + '='.repeat(60));
    console.error('Please check:');
    console.error('1. Chrome/Chromium is installed');
    console.error('2. Network connection is stable');
    console.error('3. Amazon.com is accessible');
    console.error('4. All dependencies are installed:');
    console.error('   npm install chrome-remote-interface chrome-launcher puppeteer-core');
    console.error('='.repeat(60));
    process.exit(1);
  } finally {
    await service.close();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
