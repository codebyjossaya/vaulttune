

interface VaultOptions {
    id?: string;
    song_dir: string;
    name: string | "Untitled Vault";
}

export default interface CLIConfig {
    options: VaultOptions;
    token: string;
    backend: string | undefined = 'https://vaulttune.jcamille.dev';
    address: string;
    port: string;
}
