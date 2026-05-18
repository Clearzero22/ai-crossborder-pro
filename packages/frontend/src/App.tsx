import { useWorkflowState } from './hooks/useWorkflowState';
import { useState } from 'react';
import './plugins'; // 注册所有节点插件
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import UserOverlay from './components/UserOverlay';
import UpgradeModal from './components/UpgradeModal';
import WorkflowPage from './pages/WorkflowPage';
import HomePage from './pages/HomePage';
import TemplatesPage from './pages/TemplatesPage';
import BrowserPage from './pages/BrowserPage';
import AIPage from './pages/AIPage';
import TasksPage from './pages/TasksPage';
import DataDashboardPage from './pages/DataDashboardPage';
import IntegrationsPage from './pages/IntegrationsPage';
import SettingsPage from './pages/SettingsPage';
import ExecutionDataPage from './pages/ExecutionDataPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { navItems } from './data/navItems';
import { getTemplateById } from './data/templates';
import { SoundProvider } from './hooks/useSoundSettings';
import { BrowserSettingsProvider } from './hooks/useBrowserSettings';
import { PlanProvider } from './context/PlanContext';

// websocket 连接地址
const WS_URL = (import.meta as any).env?.VITE_PLAN_WS_URL || 'ws://localhost:8080/plan-updates';

// 页面边标题映射
const pageTitles: Record<string, string> = {
  home: '首页概览',
  workflow: '工作流编辑器',
  templates: '模板市场',
  browser: '浏览器自动化',
  ai: 'AI 助手',
  tasks: '任务执行记录',
  dashboard: '数据看板',
  integrations: '集成中心',
  settings: '系统设置',
};

function AppContent() {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const {
    state, selectNode, setZoom, toggleWorkflow, setActiveTab, setNavActive, toggleSidebar,
    startExecution, stopExecution, testNode,
    addNode, removeNode, moveNode, workflowNodes,
    nodeConfigs, setNodeConfig,
    headless, setHeadless,
    loadTemplate,
    executionMode, waitingForNext, waitingNodeId,
    switchExecutionMode, triggerNextStep, updateStepOutput,
  } = useWorkflowState();

  const activeTemplate = getTemplateById(state.activeTemplateId || '');
  const workflowName = activeTemplate?.name || '未命名工作流';

  const handleZoomIn = () => setZoom(state.zoomLevel + 10);
  const handleZoomOut = () => setZoom(state.zoomLevel - 10);

  const isWorkflowPage = state.navActiveId === 'workflow';

  return (
    <>
    <Layout
      sidebar={
        <Sidebar
          navItems={navItems}
          activeNavId={state.navActiveId}
          collapsed={state.sidebarCollapsed}
          onToggle={toggleSidebar}
          onNavSelect={setNavActive}
          onUpgrade={() => setUpgradeModalOpen(true)}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      }
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarClose={() => setMobileSidebarOpen(false)}
      header={
        isWorkflowPage ? (
          <Header
            workflowName={workflowName}
            status="已保存"
            zoomLevel={state.zoomLevel}
            workflowEnabled={state.workflowEnabled}
            executing={state.executing}
            currentStep={state.currentStep}
            totalSteps={state.totalSteps}
            headless={headless}
            executionMode={executionMode}
            waitingForNext={waitingForNext}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitCanvas={() => setZoom(100)}
            onUndo={() => {}}
            onRedo={() => {}}
            onToggleWorkflow={toggleWorkflow}
            onRun={startExecution}
            onStop={stopExecution}
            onPublish={() => {}}
            onToggleHeadless={() => setHeadless(h => !h)}
            onSwitchExecutionMode={switchExecutionMode}
            onNextStep={triggerNextStep}
            onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          />
        ) : (
          <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0 gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">
                {pageTitles[state.navActiveId] || '未知页面'}
              </span>
            </div>
          </header>
        )
      }
      mainContent={
        isWorkflowPage ? (
          <WorkflowPage
            state={state}
            onSelectNode={selectNode}
            onTabChange={setActiveTab}
            onTestNode={testNode}
            onAddNode={addNode}
            onRemoveNode={removeNode}
            onMoveNode={moveNode}
            workflowNodes={workflowNodes}
            nodeConfigs={nodeConfigs}
            setNodeConfig={setNodeConfig}
            executionMode={executionMode}
            waitingNodeId={waitingNodeId}
            onSaveStepOutput={updateStepOutput}
          />
        ) : state.navActiveId === 'home' ? (
          <HomePage />
        ) : state.navActiveId === 'templates' ? (
          <TemplatesPage onLoadTemplate={(templateId) => { loadTemplate(templateId); setNavActive('workflow'); }} />
        ) : state.navActiveId === 'browser' ? (
          <BrowserPage />
        ) : state.navActiveId === 'ai' ? (
          <AIPage />
        ) : state.navActiveId === 'tasks' ? (
          <TasksPage onViewData={() => setNavActive('execution-data')} />
        ) : state.navActiveId === 'dashboard' ? (
          <DataDashboardPage />
        ) : state.navActiveId === 'integrations' ? (
          <IntegrationsPage />
        ) : state.navActiveId === 'settings' ? (
          <SettingsPage />
        ) : state.navActiveId === 'execution-data' ? (
          <ExecutionDataPage onBack={() => setNavActive('tasks')} />
        ) : (
          <PlaceholderPage pageId={state.navActiveId} />
        )
      }
      userOverlay={<UserOverlay />}
    />
    <UpgradeModal
      open={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
    />
    </>
  );
}

export default function App() {
  return (
    <PlanProvider wsUrl={WS_URL}>
      <SoundProvider>
        <BrowserSettingsProvider>
          <AppContent />
        </BrowserSettingsProvider>
      </SoundProvider>
    </PlanProvider>
  );
}
