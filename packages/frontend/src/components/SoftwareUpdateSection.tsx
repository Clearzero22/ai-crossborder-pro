import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

type CheckState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';

export default function SoftwareUpdateSection() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    api.getCurrentVersion().then(setCurrentVersion);

    const cleanupAvailable = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setCheckState('available');
    });
    const cleanupProgress = api.onUpdateDownloadProgress((p) => {
      setProgress(Math.round(p.percent));
      setCheckState('downloading');
    });
    const cleanupDownloaded = api.onUpdateDownloaded((info) => {
      setUpdateInfo({ ...info, releaseNotes: '', releaseDate: '' });
      setCheckState('downloaded');
    });

    // Listen for "no update available" from main process
    const cleanupNotAvailable = api.onUpdateNotAvailable(() => {
      setCheckState('up-to-date');
    });

    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupNotAvailable();
    };
  }, []);

  const handleCheck = async () => {
    setCheckState('checking');
    setUpdateInfo(null);
    await window.electronAPI?.checkForUpdates();
    // Timeout: if no response after 15s, show up-to-date
    setTimeout(() => {
      setCheckState((prev) => (prev === 'checking' ? 'up-to-date' : prev));
    }, 15000);
  };

  const handleDownload = () => {
    window.electronAPI?.downloadUpdate();
  };

  const handleInstall = () => {
    window.electronAPI?.installUpdate();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <h2 className="font-semibold text-gray-900">软件更新</h2>
        {currentVersion && (
          <span className="text-xs text-gray-400 ml-auto">当前版本 v{currentVersion}</span>
        )}
      </div>
      <div className="px-5 py-3.5">
        <div className="text-sm text-gray-500 mb-3">检查并安装最新版本</div>

        {/* Idle / up-to-date / error */}
        {(checkState === 'idle' || checkState === 'up-to-date' || checkState === 'error') && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCheck}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              检查更新
            </button>
            {checkState === 'up-to-date' && (
              <span className="text-sm text-green-600">已是最新版本</span>
            )}
            {checkState === 'error' && (
              <span className="text-sm text-red-500">检查失败，请稍后重试</span>
            )}
          </div>
        )}

        {/* Checking */}
        {checkState === 'checking' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            正在检查更新...
          </div>
        )}

        {/* Update available */}
        {checkState === 'available' && updateInfo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                发现新版本 v{updateInfo.version}
              </span>
              {updateInfo.releaseDate && (
                <span className="text-xs text-gray-400">
                  {new Date(updateInfo.releaseDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              下载更新
            </button>
          </div>
        )}

        {/* Downloading */}
        {checkState === 'downloading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">正在下载更新...</span>
              <span className="font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Downloaded */}
        {checkState === 'downloaded' && (
          <div className="space-y-3">
            <span className="text-sm text-green-600 font-medium">
              新版本 v{updateInfo?.version} 已下载完成
            </span>
            <div>
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                重启并安装
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
