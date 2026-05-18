import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
}

const GITHUB_RELEASES_URL = 'https://github.com/Clearzero22/ai-crossborder-pro/releases';

export default function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const cleanup = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    return cleanup;
  }, []);

  if (!updateInfo) return null;

  const handleViewUpdate = () => {
    window.electronAPI?.openExternal(GITHUB_RELEASES_URL);
  };

  const handleSkip = () => {
    window.electronAPI?.skipVersion(updateInfo.version);
    setUpdateInfo(null);
  };

  return (
    <div className="border-t border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 flex items-center justify-between">
      <span className="font-medium">
        发现新版本 v{updateInfo.version}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleViewUpdate}
          className="underline hover:text-blue-900 transition-colors"
        >
          查看更新
        </button>
        <button
          onClick={handleSkip}
          className="text-blue-400 hover:text-blue-600 transition-colors"
        >
          忽略此版本
        </button>
      </div>
    </div>
  );
}
