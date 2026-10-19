import React from 'react';

export default class AppErrorBoundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error, info) { console.error('Application error:', error, info); }
    render() {
        if (!this.state.failed) return this.props.children;
        return <main className="min-h-screen bg-rpg-bg text-white flex items-center justify-center p-6">
            <div role="alert" className="max-w-sm text-center space-y-4">
                <h1 className="text-xl font-bold">畫面暫時無法開啟</h1>
                <p>請重新載入。如果仍無法開啟，請使用更新後的 Chrome 或 Edge，並將目前網址與畫面提供給老師。</p>
                <button onClick={() => window.location.reload()} className="border-2 border-rpg-accent bg-slate-800 px-4 py-2 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">重新載入</button>
            </div>
        </main>;
    }
}
