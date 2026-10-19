// Share an in-flight login across the auth observer and explicit retries.
export const createSingleFlight = () => {
    const pending = new Map();
    return (key, operation) => {
        if (pending.has(key)) return pending.get(key);
        const promise = Promise.resolve().then(operation);
        pending.set(key, promise);
        const release = () => {
            if (pending.get(key) === promise) pending.delete(key);
        };
        promise.then(release, release);
        return promise;
    };
};

export const observeAuthStartup = ({ subscribe, onChange, onFailure, timeoutMs = 15000 }) => {
    let active = true;
    const timer = setTimeout(() => {
        if (active) onFailure({ code: 'startup/auth-timeout' });
    }, timeoutMs);
    const unsubscribe = subscribe(user => {
        if (!active) return;
        clearTimeout(timer);
        // A null user also means initialization finished: show the login button.
        onChange(user);
    }, error => {
        if (!active) return;
        clearTimeout(timer);
        onFailure(error);
    });
    return () => {
        active = false;
        clearTimeout(timer);
        unsubscribe();
    };
};

export const getLoginErrorMessage = error => {
    switch (error?.code) {
        case 'auth/popup-blocked':
            return '登入視窗被瀏覽器擋住了。請允許此網站的彈出式視窗，再按一次 GOOGLE LOGIN。';
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            return '登入視窗已關閉，請再按一次 GOOGLE LOGIN 完成登入。';
        case 'auth/unauthorized-domain':
            return '這個網址尚未開通 Google 登入，請把目前的網址提供給老師。';
        case 'auth/web-storage-unsupported':
            return '瀏覽器無法儲存登入狀態，請使用 Chrome 或 Edge 的一般視窗開啟網站。';
        case 'auth/operation-not-supported-in-this-environment':
            return '目前的瀏覽器無法開啟 Google 登入，請將網址複製到 Chrome 或 Edge 開啟。';
        case 'auth/network-request-failed':
        case 'startup/auth-timeout':
        case 'unavailable':
            return '目前無法連上登入或資料服務。請確認網路連線後重試；若持續失敗，可換一個網路再試。';
        case 'permission-denied':
            return '目前無法讀取學習資料，請將這個狀況告訴老師。';
        default:
            return '登入或讀取資料失敗，請重試。若持續發生，請將這個畫面提供給老師。';
    }
};
