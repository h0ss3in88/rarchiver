import axios from "axios"
import {MongoClient} from "mongodb"

const connectToMongoDb = ({connectionString,dbName}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const client = new MongoClient(connectionString);
            let connection = await client.connect();
            let db = connection.db(dbName);
            return resolve(db);
        }catch(err) {
            return reject(err);
        }
    });
}
const getRedditAccessToken = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const baseUrl = process.env.REDDIT_BASE_URL;
            const response = await axios({ 
                method: "POST",
                baseURL: baseUrl,
                url: "api/v1/access_token",
                proxy: {
                    protocol: "http",
                    host: "127.0.0.1",
                    port : 8580
                },
                
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "user-agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                },
                data : {"grant_type": "password", "username": process.env.REDDIT_USER_NAME, "password": process.env.REDDIT_PASSWORD },
                auth : {
                    username:process.env.REDDIT_APP_ID,
                    password: process.env.REDDIT_APP_SECRET
                }
            });
            if(response.status === 200) {
                const token = response.data["access_token"];
                const tokenType = response.data["token_type"];

                console.log(`token ${token}`);
                return resolve(token);
            }else {
                return reject(new Error(response.data));
            }
        }catch(err) {
            return reject(err);
        }
    });
}

export {getRedditAccessToken,connectToMongoDb}