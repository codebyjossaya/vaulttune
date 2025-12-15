import { useState, useEffect, useContext } from "react";
import { userVault } from "@/app/types";
import { Spinner } from "@/components/ui/spinner";
import { AuthContext } from "./AuthContext";
import { useRouter } from "next/navigation";
import CreateVault from "./VaultCreation";
function getVaults(): Promise<userVault[]> {
    return new Promise((resolve, reject) => {
        fetch('/api/user/vault/list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
            }
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                resolve(data.vaults);
            }
        }).catch((error) => {
            reject(error);
        })
    });
}

export default function Vaults() {
    const [vaults, setVaults] = useState<userVault[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [newVaultOpen, setNewVaultOpen] = useState<boolean>(false);
    const [selectedVault, setSelectedVault] = useState<userVault | null>(null);
    const authContext = useContext(AuthContext);
    const router = useRouter();
    const refreshVaults = async () => {
        getVaults().then((vaults) => {
            setVaults(vaults);
            setLoading(false);
        }).catch((error) => {
            console.error("Error fetching vaults: ", error);
            setLoading(false);
        });
    }
    useEffect(() => {
        refreshVaults();
    }, []);
    return (
        <div className="gap-4">
            
            {newVaultOpen && (<>
            <CreateVault />
            <button onClick={() => setNewVaultOpen(false)}>Close</button>
            </>)}
            {!newVaultOpen && (
                <>
                <h2>Your vaults</h2>
                <div className="flex flex-row gap-x-4 overflow-x-auto">
                    {loading ? (<Spinner />) : vaults.length === 0 ? (<p>No vaults found.</p>) : vaults.map((vault) => {
                        if (vault.owner?.uid === undefined) return null;
                        if (vault.owner?.uid !== authContext.user?.uid) return null;
                        return (
                            <div key={vault.id} className={`border border-white rounded-lg p-2 my-2 h-15 w-40 line-clamp-2 overflow-x-auto transition flex flex-col justify-between gap-2 hover:cursor-pointer ${selectedVault?.id === vault.id ? "bg-gray-700" : ""}`} onClick={() => {
                                if (selectedVault?.id === vault.id) {
                                    setSelectedVault(null);
                                    return;
                                }
                                setSelectedVault(vault);
                            }}>
                                <div>
                                    <h3>{vault.vault_name}</h3>
                                    <p>Status: {vault.status}</p>
                                </div>
                            </div>
                        );
                    })}

                </div>
                <div className="flex gap-4">
                    {selectedVault && (
                        <button className="auth transition-all duration-300 " onClick={async () => {
                                    router.push(`/app/player/connect/${selectedVault.id}`);
                                } }>Connect</button>
                    )}
                    <button className="auth" onClick={() => {setNewVaultOpen(true)}}>Add a new vault</button>
                    <button onClick={() => {
                        setLoading(true);
                        refreshVaults();
                    }}>Refresh</button>
                </div>
               
                <h2>Vaults shared with you</h2>
                <div className="flex flex-col overflow-y-auto max-h-auto">
                        {loading ? (<Spinner />) : vaults.length === 0 ? (<p>No vaults found.</p>) : vaults.map((vault) => {
                            if (vault.owner?.uid === undefined) return null;
                            if (vault.owner?.uid === authContext.user?.uid) return null;
                            return (
                                <div key={vault.id} className={`border border-white rounded-lg p-2 my-2 transition flex flex-row justify-between gap-2 hover:cursor-pointer ${selectedVault?.id === vault.id ? "bg-gray-700" : ""}`} onClick={() => {
                                    if (selectedVault?.id === vault.id) {
                                        setSelectedVault(null);
                                        return;
                                    }
                                    setSelectedVault(vault);
                                }}>
                                    <div>
                                        <h3>{vault.vault_name} | {vault.owner?.name}</h3>
                                        <p>Status: {vault.status}</p>
                                    </div>

                                    <button className="auth" onClick={async () => {
                                       router.push(`/app/player/connect/${selectedVault?.id}`);
                                    } }>Connect</button>

                                </div>
                            );

                        })}


                    </div></>
            
            )}
        </div>
            
    )
}