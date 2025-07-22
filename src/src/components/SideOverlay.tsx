import React, { type ReactNode } from "react";

interface SideOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}





export const SideOverlay: React.FC<SideOverlayProps> = ({
    isOpen,
    onClose,
    children,
}) => {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className="side-overlay"
            style={{
                alignItems: isMobile ? "flex-end" : "stretch",
                justifyContent: isMobile ? "center" : "flex-end",
                width: "100%",
                background: "rgba(0, 0, 0, 0.5)",
                
            }}
            onClick={onClose}
        >
            <div
            className={isMobile ? 'panel-mobile' : 'panel-base'}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    onClose();
                } 
            }}
                style={{
                    transform: isOpen
                        ? "translateY(0) translateX(0)"
                        : isMobile
                        ? "translateY(100%)"
                        : "translateX(100%)",
                    width: isMobile ? "100%" : "30vw",
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "2vh",
                        right: 16,
                        background: "gray",
                        border: "none",
                        fontSize: 24,
                        cursor: "pointer",
                    }}
                    aria-label="Close"
                >
                    &times;
                </button>
                <div style={{ marginTop: 'calc(5vh + 61px)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};