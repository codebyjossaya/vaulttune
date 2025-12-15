import * as admin from "firebase-admin";
import { getApp } from "firebase-admin/app";


const firebaseAdminConfig = {
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://vaulttunemusic-default-rtdb.firebaseio.com'
};


let app;
try {
    app = getApp();
} catch {
    app = admin.initializeApp(firebaseAdminConfig);
}

const auth = admin.auth(app);
const database = admin.database(app);

export { app, auth, database};

export const runtime = 'nodejs'