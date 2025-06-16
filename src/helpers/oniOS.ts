export function isOniOS(window: Window) {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // iOS devices are usually identified by "iPhone", "iPad", or "iPod"
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}