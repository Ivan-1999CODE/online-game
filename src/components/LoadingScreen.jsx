import React, { useEffect, useState } from 'react';

export default function LoadingScreen({ message = '正在載入學習資料…', slowAfterMs = 12000 }) {
    const [slow, setSlow] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setSlow(true), slowAfterMs);
        return () => clearTimeout(timer);
    }, [slowAfterMs]);

    return <div className="flex flex-col items-center justify-center h-full bg-rpg-bg z-50 absolute inset-0 p-6 text-center overflow-y-auto text-white">
        <div aria-hidden="true" className="w-16 h-16 shrink-0 border-4 border-rpg-accent animate-spin rounded-full border-t-transparent" />
        <p role="status" className="font-retro text-base mt-4">{message}</p>
        {slow && <div className="mt-5 max-w-xs space-y-4">
            <p className="font-retro text-sm text-amber-200">連線比平常慢。請確認網路是否正常，或重新載入再試一次。</p>
            <button type="button" onClick={() => window.location.reload()} className="border-2 border-rpg-accent bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">重新載入</button>
        </div>}
    </div>;
}
