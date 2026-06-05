// Detects if the app is running in the Tauri native webview
export const isTauri = () => '__TAURI_INTERNALS__' in window;
