import SocketProvider from "@/app/components/SocketProvider";
import { StateProvider } from "./components/StateProvider";
import OverlayProvider from "@/components/OverlayProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SocketProvider>
            <StateProvider>

                <OverlayProvider>
                    {children}
                </OverlayProvider>
            </StateProvider>
        </SocketProvider>
        
        
    )
}