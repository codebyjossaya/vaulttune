import e, { request } from "express";
import express from "express"
import { initializeApp, credential } from "firebase-admin";
import {applicationDefault } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Database, getDatabase } from "firebase-admin/database";
import {sign, verify, JwtPayload} from "jsonwebtoken";
import { readFileSync } from "node:fs";

const verifyServer = (req: e.Request) => {
    const verified = verify(req.body.token, readFileSync("./public.jey", "utf-8"), { algorithms: ["RS256"] });
    if (typeof verified === 'string') {
        return JSON.parse(verified);
    } else if (typeof verified === 'object') {
        return verified as JwtPayload
    }
    throw new Error('Invalid token');
}

export class Server {
    private app: express.Application = express();
    private port = 3000;
    public firebase;
    public auth: Auth;
    public database: Database;
        constructor() {
            this.firebase = initializeApp({
                credential: credential.cert("./vaulttunemusic_key.json"),
                databaseURL: "https://vaulttunemusic-default-rtdb.firebaseio.com"
            })
            this.auth = getAuth(this.firebase);
            this.database = getDatabase(this.firebase)
            this.app.get('/auth/server/token', async (req: e.Request ,res: e.Response) => {
                try {
                    let token = await this.auth.verifyIdToken(req.body.token)
                    // generate permanent system JWT
                    const custom_token = sign(token,readFileSync("./private.key","utf-8"),{algorithm: 'RS256'})
                    res.json({status:"success",token: custom_token})
                    res.end()
                } catch(error) {
                    console.log(error)
                    res.json({status: "failed",error:error.message})
                    res.end()
                }
            })
            this.app.get('/auth/server/verifyUser', async (req: e.Request,res:e.Response) => {
                try {
                    let server_token = verifyServer(req)
                    let user_token = await this.auth.verifyIdToken(req.body.user_token)
                    res.json({status: "success",uid:user_token.uid})
                } catch (error) {
                    res.json({status: "failed",error:error.message})
                    res.end()
                }
            })
            this.app.post('/auth/server/register', async (req: e.Request, res: e.Response) => {
                // register a vault's name with its appropriate tunnel URL
                try {
                        let server_token = verifyServer(req)
                        let ref = this.database.ref(`/users/${server_token}`)
                } catch (error) {

                }
            })
        }
    start(): void {
        this.app.listen(this.port, () => {
            console.log(`Listening on port ${this.port}`)
        })
    }
}
