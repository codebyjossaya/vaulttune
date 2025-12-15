import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
export default function CreateVault() {
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => {
        fetch('/api/user/vault/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
            }
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
            }
            setLoading(false);
        }).catch((error) => {
            console.error("Error creating vault: ", error);
            setLoading(false);
        });
    }, [])
    return (
        <div>
            <h2>Create a new Vault</h2>
            {loading ? (<Spinner />) : (
                <div className="flex flex-col gap-4">
                    <i>Do not use this token if you intend to use the Vault GUI app.</i>
                    <div className="h-0.5 w-full bg-white"></div>
                    <p>Instructions:</p>
                    
                    <p>First, download the Vault CLI from <a href="https://vaulttune.jcamille.dev/download" className="text-blue-500 underline">here</a>.</p>
                    <p></p>
                    <p>Your vault token is: </p>
                    <div className="bg-gray-700 p-4 rounded-lg  whitespace-nowrap overflow-x-scroll overflow-y-hidden">
                        <p className="font-mono">{token?.trim().replace("\n", "")}</p>
                    </div>
                    <p>Copy and paste this token into your Vault config file.</p>
                </div>
            )}
        </div>
    );
}