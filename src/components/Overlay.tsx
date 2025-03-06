
export function Overlay({ children }: {children: React.ReactNode}) {
    return (
        <div id="overlay" onClick={(e) => {
            const overlay = e.currentTarget;
            overlay.style.display = "none";
        }}>
            {(children)}
        </div>
    );    
}

