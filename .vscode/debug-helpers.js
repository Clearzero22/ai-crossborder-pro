/**
 * VS Code 调试辅助函数
 * 在 Debug Console 中使用
 */

// 查看工作流执行状态
function showWorkflowStatus() {
  console.log('=== 工作流状态 ===');
  console.log('当前步骤:', window.workflowEngine?.currentStep);
  console.log('执行模式:', window.workflowEngine?.executionMode);
  console.log('等待节点:', window.workflowEngine?.waitingNodeId);
}

// 查看 DataBus 中的所有数据
function showDataBus() {
  console.log('=== DataBus 内容 ===');
  if (window.dataBus) {
    const outputs = window.dataBus.getAllOutputs();
    Object.entries(outputs).forEach(([nodeId, output]) => {
      console.log(`\n节点: ${nodeId}`);
      console.log(JSON.stringify(output, null, 2));
    });
  } else {
    console.log('DataBus 不可用');
  }
}

// 查看特定节点的输出
function showNodeOutput(nodeId) {
  console.log(`=== 节点 ${nodeId} 的输出 ===`);
  if (window.dataBus) {
    const output = window.dataBus.getOutput(nodeId);
    console.log(JSON.stringify(output, null, 2));
  }
}

// 查看环境变量
function showEnv() {
  console.log('=== 环境变量 ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATA_DIR:', process.env.DATA_DIR);
  console.log('PORT:', process.env.PORT);
}

// 查看 API 响应
async function testApi(endpoint, body) {
  try {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log(`API ${endpoint} 响应:`, data);
    return data;
  } catch (error) {
    console.error(`API ${endpoint} 错误:`, error);
  }
}

// 测试健康检查
async function testHealth() {
  const response = await fetch('/api/health');
  const data = await response.json();
  console.log('健康检查:', data);
  return data;
}

// 列出所有已注册插件
function showPlugins() {
  console.log('=== 已注册插件 ===');
  if (window.pluginRegistry) {
    const plugins = window.pluginRegistry.getAll();
    plugins.forEach(p => {
      console.log(`- ${p.id}: ${p.label}`);
    });
  }
}

// 查看当前模板配置
function showTemplate() {
  console.log('=== 当前模板 ===');
  if (window.activeTemplate) {
    console.log('模板ID:', window.activeTemplate.id);
    console.log('节点列表:', window.activeTemplate.nodeIds);
    console.log('默认配置:', window.activeTemplate.defaultConfigs);
  }
}

// 快速调试路径问题
function debugPathIssue() {
  console.log('=== 路径调试 ===');
  console.log('当前URL:', window.location.href);
  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  
  // 检查是否有硬编码路径
  const allScripts = document.querySelectorAll('script');
  allScripts.forEach(script => {
    if (script.src && script.src.includes('clearzero22')) {
      console.warn('发现硬编码路径:', script.src);
    }
  });
}

// 导出到全局
window.debugHelpers = {
  showWorkflowStatus,
  showDataBus,
  showNodeOutput,
  showEnv,
  testApi,
  testHealth,
  showPlugins,
  showTemplate,
  debugPathIssue
};

console.log('=== 调试辅助函数已加载 ===');
console.log('可用命令:');
console.log('- debugHelpers.showWorkflowStatus()');
console.log('- debugHelpers.showDataBus()');
console.log('- debugHelpers.showNodeOutput("ai-vision")');
console.log('- debugHelpers.testHealth()');
console.log('- debugHelpers.debugPathIssue()');