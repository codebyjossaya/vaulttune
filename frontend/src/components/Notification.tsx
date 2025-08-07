import React from "react";
import { useEffect } from "react";

export default function Notification({ message, type, dismiss, duration }: { message: string; type: 'success' | 'error' | 'warning'; dismiss?: React.Dispatch<React.SetStateAction<boolean>>; duration?: number }) {
    useEffect(() => {
        if (duration && dismiss) {
            const timer = setTimeout(() => {
                dismiss(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, dismiss]);

    return (
        <div className={`notification`}>
            {type === 'success' && <span>✔️</span>}
            {type === 'error' && <span>❌</span>}
            {type === 'warning' && <span>⚠️</span>}
            {message}
            {dismiss ? <button onClick={() => dismiss(false)}>Dismiss</button> : null}
        </div>
    );
}
