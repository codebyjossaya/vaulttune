// @ts-ignore
export function isOniOS(window: Window) {
    // @ts-ignore
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // iOS devices are usually identified by "iPhone", "iPad", or "iPod"
    // @ts-ignore
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}