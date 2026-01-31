import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tooltip } from "@/components/ui/tooltip";
import { DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { useState } from "react";

 interface buttonType {
    icon: React.ReactNode;
    action: () => void;
    tooltip?: string;
}

export default function DisplayMode({children, title, setOpen, buttons, className}: {children: React.ReactNode, title: string, setOpen: (open: boolean) => void, buttons?: buttonType[], className?: string}) {
    const [open, setOp] = useState(true);
    if ( window.innerWidth < 768) {
        return (
            <Drawer open={open} onOpenChange={() => {
                setOp(!open);
                setOpen(!open);
            }}>
                
                <DrawerContent className={`absolute z-100000 scrollbar bg-black px-6 min-h-[50vh] ${className ? className : ""}`} onClick={(e) => {e.stopPropagation()}}>
                    <DrawerHeader>
                        <DrawerTitle className="text-white text-3xl">{title}</DrawerTitle>
                        <div className="flex flex-row gap-4 items-center justify-center">
                            {buttons && buttons.map((button, index) => (
                                <Tooltip key={index}>
                                    <TooltipTrigger asChild>
                                        <div onClick={button.action} className="hover:cursor-pointer">
                                            {button.icon}
                                        </div>
                                    </TooltipTrigger>
                                    {button.tooltip && 
                                    <TooltipContent className="bg-black rounded-xl">
                                        <p>{button.tooltip}</p>
                                    </TooltipContent>}

                                </Tooltip>
                                
                            ))}
                        </div>
                        <div className="w-full h-0.5 bg-amber-50/30 my-2"/>

                    </DrawerHeader>
                    <div className="flex flex-col flex-1 scrollbar overflow-y-auto items-center place-items-start">
                        {children}
                    </div>
                    
                </DrawerContent>
                
            </Drawer>
        )
    } else {
        return (
            <div className={`flex flex-col fade-in fixed z-10000 w-screen h-screen items-center justify-center bg-black/30 backdrop-blur-2xl top-0 left-0 S`}>

            <Dialog open={open} onOpenChange={() => {
                setOp(!open);
                setOpen(!open);
            }}>
                
                    <DialogContent className={`${!className?.includes('h-') ? "max-h-[80vh]" : ""} relative border-black my-2 scrollbar bg-black p-6 rounded-xl pb-10 grid grid-rows-[auto_1fr] ${className ? className : ""} `} onClick={(e) => {e.stopPropagation()}}>
                        <DialogHeader className="flex flex-row justify-between items-center mb-4">
                            <DialogTitle className="text-3xl">{title}</DialogTitle>
                            <div className="flex flex-row gap-4 items-center justify-center">
                            {buttons && buttons.map((button, index) => (
                                <Tooltip key={index}>
                                    <TooltipTrigger asChild>
                                        <div onClick={button.action} className="hover:cursor-pointer">
                                            {button.icon}
                                        </div>
                                    </TooltipTrigger>
                                    {button.tooltip && 
                                    <TooltipContent className="bg-black rounded-xl p-1">
                                        <p>{button.tooltip}</p>
                                    </TooltipContent>}

                                </Tooltip>
                                
                            ))}
                        </div>
                        </DialogHeader>
                        <div className="flex flex-col flex-1 scrollbar overflow-y-auto">
                            {children}
                        </div>
                        
                    </DialogContent>
            </Dialog>
            </div>
        );
    }
        
}