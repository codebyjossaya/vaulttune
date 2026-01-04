import ErrorProvider from "@/app/components/ErrorProvider";
import SocketProvider from "@/app/components/SocketProvider";
import { StateProvider } from "./components/StateProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SocketProvider>
            <StateProvider>
                <ErrorProvider>
                        {children}
                </ErrorProvider>
            </StateProvider>
        </SocketProvider>
        
        
    )
}