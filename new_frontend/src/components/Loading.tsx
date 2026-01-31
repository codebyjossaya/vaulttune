import { Spinner } from "@/components/ui/spinner";

export default function Loading({ message }: { message: string }) {
    return (
        <div className="fixed top-0 left-0 w-screen h-screen backdrop-blur-2xl z-100001">
            <div className="mt-4 w-full flex flex-col items-center justify-center">
            <p>{message}</p>
            <Spinner className="size-24" />
        </div>
        </div>
        
    )
}