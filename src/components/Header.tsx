import React from "react";

export function Header({children, ref}: { children?: React.ReactNode, ref: React.Ref<HTMLDivElement> } ) {
    
    return (
        <div className="header" ref={ref}>
            <h3>VaultTune</h3>
            <div style={{display: 'flex',flexDirection: "row"}}>
                {children}
            </div>
            
        </div>
    );
}