import { useState } from 'react';
import { useBrowserSettings } from '../hooks/useBrowserSettings';

export default function BrowserConfigSection() {
  const {
    settings, chromeStatus, playwrightStatus, chromiumVersion, loading, error,
    testResult, testing, downloading, downloadProgress, downloadError,
    updateSettings, testBrowser, downloadPlaywright,
  } = useBrowserSettings();

  const [customPath, setCustomPath] = useState('');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <SectionIcon />
          <h2 className="font-semibold text-gray-900">浏览器配置</h2>
        </div>
        <div className="px-5 py-8 text-center text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  const activePath = customPath.trim() || (settings.playwrightPath || '').trim();
  const handleDownload = () => {
    if (!activePath) return;
    downloadPlaywright(activePath);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <SectionIcon />
        <h2 className="font-semibold text-gray-900">浏览器配置</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {/* Browser Mode Selection */}
        <div className="px-5 py-3.5">
          <div className="text-sm font-medium text-gray-900 mb-2">浏览器模式</div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="browserMode"
                checked={settings.mode === 'system-chrome'}
                onChange={() => updateSettings({ mode: 'system-chrome' })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">系统 Chrome</span>
              <span className="text-xs text-gray-400">(推荐)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="browserMode"
                checked={settings.mode === 'playwright-chromium'}
                onChange={() => updateSettings({ mode: 'playwright-chromium' })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Playwright Chromium</span>
            </label>
          </div>
        </div>

        {/* Chrome Status */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <div className="text-sm font-medium text-gray-900">系统 Chrome 状态</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {chromeStatus.exists ? chromeStatus.path : '未检测到 Chrome，请先安装 Google Chrome'}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${chromeStatus.exists ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {chromeStatus.exists ? '已检测到' : '未安装'}
          </span>
        </div>

        {/* Playwright Chromium section */}
        {settings.mode === 'playwright-chromium' && (
          <>
            {/* Version info */}
            {chromiumVersion && (
              <div className="px-5 py-2.5 bg-blue-50">
                <span className="text-xs text-blue-700">
                  可用版本: Chrome for Testing {chromiumVersion}（从 Playwright CDN 下载，约 190MB）
                </span>
              </div>
            )}

            {/* Path input + download */}
            <div className="px-5 py-3.5">
              <div className="text-sm font-medium text-gray-900 mb-1">Chromium 存储路径</div>
              <div className="text-xs text-gray-500 mb-2">指定下载后 Chromium 的存储目录</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.playwrightPath || customPath || ''}
                  onChange={(e) => {
                    setCustomPath(e.target.value);
                    if (settings.playwrightPath) updateSettings({ playwrightPath: e.target.value });
                  }}
                  placeholder="例如: C:\Users\用户名\ms-playwright"
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleDownload}
                  disabled={downloading || !activePath}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {downloading ? '下载中...' : '下载'}
                </button>
              </div>

              {/* Install status */}
              <div className="mt-2">
                {playwrightStatus.installed ? (
                  <span className="text-xs text-green-600">Chromium 已安装</span>
                ) : activePath ? (
                  <span className="text-xs text-amber-600">指定路径下未找到 Chromium，请点击下载</span>
                ) : (
                  <span className="text-xs text-gray-400">请输入存储路径，然后点击下载</span>
                )}
              </div>

              {/* Download progress bar */}
              {downloadProgress && downloading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{downloadProgress.stage}</span>
                    <span className="text-xs font-medium text-gray-600">{downloadProgress.percent}%</span>
                  </div>
                </div>
              )}

              {/* Download complete */}
              {!downloading && downloadProgress && downloadProgress.percent >= 100 && !downloadError && (
                <div className="mt-2">
                  <span className="text-xs text-green-600">{downloadProgress.stage}</span>
                </div>
              )}

              {/* Download error */}
              {downloadError && (
                <div className="mt-2 text-xs text-red-500">
                  下载失败: {downloadError}
                </div>
              )}
            </div>

            {/* Test button */}
            {playwrightStatus.installed && (
              <>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-gray-900">测试浏览器连接</div>
                    <div className="text-xs text-gray-500 mt-0.5">启动浏览器验证配置是否正确</div>
                  </div>
                  <button
                    onClick={testBrowser}
                    disabled={testing}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </button>
                </div>

                {testResult && (
                  <div className={`px-5 py-3.5 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.success
                      ? `连接成功 — ${testResult.browserName} ${testResult.version}`
                      : `连接失败: ${testResult.error}`}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Info note */}
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            ChatGPT 文件上传和 Amazon CDP 搜索服务始终使用系统 Chrome，不受此设置影响。
          </p>
        </div>

        {error && (
          <div className="px-5 py-3.5 text-sm text-red-500">{error}</div>
        )}
      </div>
    </div>
  );
}

function SectionIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}
