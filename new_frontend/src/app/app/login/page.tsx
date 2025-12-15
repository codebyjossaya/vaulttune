'use client';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { GoogleLoginButton } from "react-social-login-buttons"
import { auth, provider } from '@/lib/firebase/main';
import { useRouter } from "next/navigation";

export default function Login() {
    const router = useRouter();
    return (
        <div className="absolute w-screen h-screen flex items-center justify-center">
            <div className="bg-gray-950/30 rounded-lg flex flex-col justify-center text-center h-96 w-96 p-20 gap-4">
            <div>
                <h1>VaultTune</h1>
                <div className="h-0.5 w-full my-2 bg-gray-400"></div>
                <h2>Sign into VaultTune</h2>
            </div>
                <div className="">
                    <button className="auth" onClick={() => {
                        signInWithPopup(auth, provider).then(async () => {
                            const token = await auth.currentUser?.getIdToken();
                            document.cookie = `auth_token=${token}; path=/; max-age=86400`;
                            router.push("/app/dashboard");
                        }).catch((error) => {
                            console.error("Error during sign in: ", error);
                        });
                    }}>Sign in with Google</button>
                </div>
            </div>
        </div>
    )
}