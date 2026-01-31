'use client';
import { createContext, useState } from "react";
import DisplayMode from "./DisplayMode";

export const OverlayContext = createContext<{
    setOverlay: ({content, title}: {content: React.ReactNode, title: string}) => void;
    clearOverlay: () => void;
    setButtons: (buttons: buttonType[]) => void;
}>({
    setOverlay: () => {},
    clearOverlay: () => {},
    setButtons: () => {},
});

 interface buttonType {
    icon: React.ReactNode;
    action: () => void;
    tooltip?: string;
}


export default function OverlayProvider({children}: {children: React.ReactNode}) {
    const [overlay, setOverlayContent] = useState<{content: React.ReactNode, title: string, buttons?: buttonType[]} | null>(null);
    const [ buttons, setButtons ] = useState<buttonType[]>([]);
    const setOverlay = ({content, title}: {content: React.ReactNode, title: string}) => {
        console.log("Overlay set!")
        setOverlayContent({content, title});
    };

    const clearOverlay = () => {
        setButtons([])
        setOverlayContent(null);

    };

    return (
        <OverlayContext.Provider value={{setOverlay, clearOverlay, setButtons}}>
            {children}
            {overlay && (
                <DisplayMode title={overlay.title} setOpen={clearOverlay} buttons={buttons.length > 0 ? buttons : undefined}>
                    {overlay.content}
                </DisplayMode>
            )}
        </OverlayContext.Provider>
    );

}