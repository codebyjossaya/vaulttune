'use client';
import { signInWithPopup } from "firebase/auth";
import { GoogleLoginButton } from "react-social-login-buttons"
import { auth, provider } from '@/lib/firebase/main';
import { useRouter, useSearchParams } from "next/navigation";


export default function Login() {
    const router = useRouter();
    const params = useSearchParams();
    const redirectPath = params.get('redirect') || '/app/dashboard';
    return (
        <div className="absolute w-screen h-screen flex items-center justify-center">
            <div className={"fixed inset-0 pointer-events-none z-0 bg-violet-900 mask-[url(/vaulttune-foreground.svg)] mask-repeat-no-repeat mask-size-cover opacity-40"} />
            <div className="z-1 bg-zinc-950/30 rounded-lg flex flex-col justify-center text-center w-screen h-screen lg:h-96 lg:w-96 p-20 gap-4">
            <div>
                <h1>Welcome to VaultTune</h1>
                <div className="h-0.75 w-full my-2 hidden lg:visible bg-gray-400"></div>
                <h2>Sign into VaultTune</h2>
            </div>
                <div className="">
                    <button className="auth" onClick={() => {
                        signInWithPopup(auth, provider).then(async () => {
                            const token = await auth.currentUser?.getIdToken();
                            document.cookie = `auth_token=${token}; path=/; max-age=86400`;
                            router.push(redirectPath);
                        }).catch((error) => {
                            console.error("Error during sign in: ", error);
                        });
                    }}>Sign in with Google</button>
                </div>
            </div>
        </div>
    )
}