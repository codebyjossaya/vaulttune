import { userVault } from "@/app/types";
import DisplayMode from "@/components/DisplayMode";
import Loading from "@/components/Loading";
import { useState } from "react";

export default function DeleteView({vault, onClose}: {vault: userVault, onClose: () => void}) {
    const [ loading, setLoading ] = useState<boolean>(false);
    return !loading ? (
        <DisplayMode title="Delete Vault" setOpen={onClose}>
            <p>Are you sure you want to delete the vault: <strong>{vault.vault_name}</strong>? This action cannot be undone.</p>
            <div className="flex flex-row gap-4 mt-4">
                <button onClick={() => {
                    setLoading(true);
                    fetch(`/api/user/vault/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
                        },
                        body: JSON.stringify({ vault_id: vault.id })
                    }).then(async (res) => {
                        if (res.ok) {
                            setLoading(false);
                            onClose();
                        } else {
                            console.error("Error deleting vault: ", await res.text());
                            setLoading(false);
                        }
                    });
                }} className="danger">Yes</button>
                <button onClick={onClose}>No</button>
            </div>
        </DisplayMode>
    ) : <Loading message="Deleting vault..." />;
}