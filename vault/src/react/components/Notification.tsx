import type React from "react";

export default function Notification({ message, type, dismiss }: { message: string; type: 'success' | 'error' | 'warning'; dismiss: React.Dispatch<React.SetStateAction<boolean>> }) {
    setTimeout(() => {
        dismiss(false);
    }, 5000);

    if (!message) return null;
    return (
        <div className={`notification`}>
            {type === 'success' && <span>✔️</span>}
            {type === 'error' && <span>❌</span>}
            {type === 'warning' && <span>⚠️</span>}
            {message}
        </div>
    );
}
