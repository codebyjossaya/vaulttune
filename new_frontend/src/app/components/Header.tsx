
'use client';
import { usePathname } from "next/navigation";
export default function Header() {
    return (
        <div className={`bg-transparent ${usePathname() === '/' ? 'absolute' : 'sticky'} flex flex-row py-10 px-4 justify-center items-center`}>
            <p className="font-bold text-2xl">VaultTune</p>
            <p className="font-bold text-2xl mx-2"> | </p>
            <div className="gap-4 flex flex-row">
                <a className="link text-center items-center">Docs</a>
                <a className="link text-center items-center">Download</a>
                <a className="link text-center items-center" href="https://github.com/codebyjossaya/vaulttune">GitHub</a>
            </div>



        </div>
    )
}