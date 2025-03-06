
interface LoadingProps {
    text: string
}
export function Loading({text}: LoadingProps) {
    return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">{text}</p>
            <style>{`
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    border-top: 4px solid #3498db;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 10px;
                }
                .loading-text {
                    color: #ffffff;
                    font-size: 16px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}