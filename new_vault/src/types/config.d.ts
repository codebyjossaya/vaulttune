

export default interface VaultOptions {
    id?: string;
    song_dir: string;
    name: string | "Untitled Vault";
    backend: string | undefined = 'https://vaulttune.jcamille.dev';
    token: string;
    address: string;
    port: number;
}
