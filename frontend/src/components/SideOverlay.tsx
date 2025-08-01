import React, { ReactNode } from "react";

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
        console.log(checkMobile());
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
                
                
            }}
            onClick={onClose}
        >
            <div
            className={isMobile ? 'panel-mobile' : 'panel-base'}
            tabIndex={0}
            onKeyDown={(e) => {
                console.log("Key pressed:", e.key);
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
                    width: isMobile ? "100%" : "50vw",
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
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
                {children}
                
            </div>
        </div>
    );
};