'use client';
import {
    useState,
    createContext
    
 } from "react";
import { 
    Alert, 
    AlertDescription, 
    AlertTitle 
} from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";




export const AlertContext = createContext<{
    setAlert: (content: React.ReactNode, type: "info" | "error") => void;
    clearAlert: () => void;
}>({
    setAlert: () => {},
    clearAlert: () => {},
});

export default function AlertProvider({children}: {children: React.ReactNode}) {
    const [alerts, setAlerts] = useState<{content: React.ReactNode, type: "info" | "error"}[]>([]);

    const setAlertContent = (content: React.ReactNode, type: "info" | "error") => {
        setAlerts(prevAlerts => [...prevAlerts, { content, type }]);
        setTimeout(() => {
            setAlerts(prevAlerts => prevAlerts.filter(s => s.content !  == content));
        }, 5000);
    };

    const clearAlert = () => {
        setAlerts([]);
    };
    return (
        <AlertContext.Provider value={{setAlert: setAlertContent, clearAlert}}>
            {children}
            {alerts.map((alert, index) => (
                <Alert key={index} variant="destructive" className={`${alert.type === 'error' ? 'text-red' : 'text-white'} fixed top-5 right-10 bg-gray-700 transition-opacity ${alert.type === "error" ? "opacity-100" : "pointer-events-none"} w-[3/10] z-100000`} onClick={() => clearAlert()}>
                    <AlertCircleIcon />
                    {alert.type === "error" ? (<AlertTitle>An error has occurred.</AlertTitle>) : (
                        <AlertTitle>Info</AlertTitle>
                    )}
                    <AlertDescription className={alert.type === 'error' ? 'text-red' : 'text-white'}>{alert.content}</AlertDescription>
                </Alert>
            ))}
        </AlertContext.Provider>
    );


}
