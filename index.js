import {createServer} from "http"
import {config} from "dotenv"
import {initApp} from "./src/server.js"
import {getRedditAccessToken,connectToMongoDb} from "./src/helpers.js"
(async function() {
    config();
    try {
        const connectionString = process.env.MONGODB_CONNECTION_STRING;
        const dbName = process.env.MONGODB_DB_NAME;
        let allPromises = Promise.all([connectToMongoDb({connectionString,dbName}),getRedditAccessToken()]);
        let results = await allPromises;
        let db = results[0];
        let accessToken = results[1];
        let app = await initApp({accessToken,db});
        const server = createServer(app);
        server.listen(app.get("PORT"), () => {
            console.log(`application ready and running at ${server.address().address}:${server.address().port}`);
        });
    }catch(err) {
        console.log(err);
        process.exit(1);
    }
})();