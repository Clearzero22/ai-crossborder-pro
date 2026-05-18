import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

type UpdateState = 'available' | 'downloading' | 'downloaded';

export default function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [state, setState] = useState<UpdateState>('available');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const cleanupAvailable = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setState('available');
    });

    const cleanupProgress = api.onUpdateDownloadProgress((p) => {
      setProgress(Math.round(p.percent));
      setState('downloading');
    });

    const cleanupDownloaded = api.onUpdateDownloaded(() => {
      setState('downloaded');
    });

    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
    };
  }, []);

  if (!updateInfo) return null;

  const handleDownload = () => {
    window.electronAPI?.downloadUpdate();
  };

  const handleInstall = () => {
    window.electronAPI?.installUpdate();
  };

  const handleSkip = () => {
    window.electronAPI?.skipVersion(updateInfo.version);
    setUpdateInfo(null);
    setState('available');
    setProgress(0);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 flex items-center justify-between shadow-sm">
      {state === 'available' && (
        <>
          <span className="font-medium">
            发现新版本 v{updateInfo.version}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              立即更新
            </button>
            <button
              onClick={handleSkip}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              稍后提醒
            </button>
          </div>
        </>
      )}

      {state === 'downloading' && (
        <>
          <span className="font-medium">
            正在下载更新... {progress}%
          </span>
          <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {state === 'downloaded' && (
        <>
          <span className="font-medium">
            新版本 v{updateInfo.version} 已下载完成
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleInstall}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              重启安装
            </button>
            <button
              onClick={handleSkip}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              稍后安装
            </button>
          </div>
        </>
      )}
    </div>
  );
}
