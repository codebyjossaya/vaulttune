import React from "react";

export default function Notification({ message, type, dismiss }: { message: string; type: 'success' | 'error' | 'warning'; dismiss: React.Dispatch<React.SetStateAction<boolean>> }) {
    return (
        <div className={`notification`}>
            {type === 'success' && <span>✔️</span>}
            {type === 'error' && <span>❌</span>}
            {type === 'warning' && <span>⚠️</span>}
            {message}
            <button onClick={() => dismiss(false)}>Dismiss</button>
        </div>
    );
}
