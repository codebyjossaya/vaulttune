import { useState, useEffect, useContext } from "react";
import { userVault } from "@/app/types";
import { Spinner } from "@/components/ui/spinner";
import { AuthContext } from "./AuthContext";
import { useRouter } from "next/navigation";
import CreateVault from "./VaultCreation";
import { PlusIcon, Settings, Share2, Trash } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import ShareVaultView from "./ShareVaultView";
import DeleteView from "./DeleteView";

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
    const [loading, setLoading] = useState<boolean>(true);
    const [newVaultOpen, setNewVaultOpen] = useState<boolean>(false);
    const [selectedVault, setSelectedVault] = useState<userVault | null>(null);
    const [ shareOverlay, setShareOverlay ] = useState<userVault | null>(null);
    const [ deleteOverlay, setDeleteOverlay ] = useState<userVault | null>(null);
    const [ ownedVaults, setOwnedVaults ] = useState<userVault[]>([]);
    const [ sharedVaults, setSharedVaults ] = useState<userVault[]>([]);
    const authContext = useContext(AuthContext);
    const router = useRouter();
    const refreshVaults = async () => {
        getVaults().then((vaults) => {
            setOwnedVaults(vaults.filter(v => v.owner?.uid === authContext.user?.uid));
            setSharedVaults(vaults.filter(v => v.owner?.uid !== authContext.user?.uid));
            setLoading(false);
        }).catch((error) => {
            console.error("Error fetching vaults: ", error);
            setLoading(false);
        });
    }
    useEffect(() => {
        refreshVaults();
    }, [authContext.user]);
    return (
        <div className="gap-4">
            {shareOverlay && (
                <ShareVaultView vault={shareOverlay} onClose={() => setShareOverlay(null)} />
            )}
            { deleteOverlay && <DeleteView vault={deleteOverlay} onClose={() => {
                setDeleteOverlay(null);
                refreshVaults();
                setSelectedVault(null);
            }} /> }
            {newVaultOpen && (<>
            <CreateVault />
            <button onClick={() => setNewVaultOpen(false)}>Close</button>
            </>)}
            {!newVaultOpen && (
                <>
                <div className="flex flex-row gap-2">
                    <h2>Your vaults</h2>
                    <h1>|</h1>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="border-0 p-1 rounded-4xl" onClick={() => setNewVaultOpen(true)}><PlusIcon /></button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Create a new vault
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="border-0 p-1 rounded-4xl" onClick={() => {
                                setLoading(true);
                                refreshVaults();
                            }}><RefreshCw /></button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Refresh vault list
                        </TooltipContent>
                    </Tooltip>
                    
                </div>
                <div className="flex flex-row gap-x-4 overflow-x-auto justify-center">
                    {loading ? (<Spinner />) : ownedVaults.length === 0 ? (<p>No vaults found.</p>) : ownedVaults.map((vault) => {

                        return (
                            <div key={vault.id} className={`border border-white rounded-lg p-4 my-2 size-fit line-clamp-2 overflow-x-auto transition flex flex-col justify-between gap-2 hover:cursor-pointer hover:-translate-y-0.5 ${selectedVault?.id === vault.id ? "bg-gray-700" : ""}`} onClick={() => {
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
                <div className="flex gap-4 mt-2 justify-center ">
                    {selectedVault && selectedVault.status === "online" && (
                        <div className="flex">
                            <button className="auth fade-in transition-all duration-300 self-center" onClick={async () => {
                                        router.push(`/app/player/connect/${selectedVault.id}`);
                                    } }>Connect</button>
                            <div className="h-full w-0.5 bg-white ml-4 mr-2" />
                            
                            <button className="border-0 p-1"><Share2 onClick={() => {
                                setShareOverlay(selectedVault)
                            }}/></button>
                            <button className="border-0 p-1" onClick={() => {
                                setDeleteOverlay(selectedVault);
                            }}><Trash /></button>
                        </div>
                    )}
                </div>
               
                <h2>Vaults shared with you</h2>
                <div className="flex flex-col overflow-y-auto max-h-auto">
                        {loading ? (<Spinner />) : sharedVaults.length === 0 ? (<p>No vaults found.</p>) : sharedVaults.map((vault) => {
                            if (vault.owner?.uid === undefined) return null;
                            if (vault.owner?.uid === authContext.user?.uid) return null;
                            return (
                                <div key={vault.id} className={`border border-white rounded-lg p-2 my-2 transition flex flex-row justify-between gap-2 hover:cursor-pointer`} onClick={() => {
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

                                    {vault?.status === "online" && <button className="auth" onClick={async () => {
                                       router.push(`/app/player/connect/${vault.id}`);
                                    } }>Connect</button>}

                                </div>
                            );

                        })}


                    </div></>
            
            )}
        </div>
            
    )
}