import express from "express"
import logger from "morgan"
import responseTime from "response-time"
import compression from "compression"
import httpStatus from "http-status"
import axios from "axios"

const initApp = function({accessToken,db}) {
    return new Promise(async (resolve, reject) => {
        try {
            const oauthUrl = process.env.REDDIT_OAUTH_URL;
            let app = express();
            app.use(logger("dev"));
            app.use(compression());
            app.use(responseTime());
            app.set("PORT", process.env.APPLICATION_PORT || 3122);
            app.use((req,res,next) => {
                Object.defineProperty(req,"db",{
                    configurable: true,
                    enumerable: true,
                    writable:true,
                    value:db
                });
                return next();
            });
            app.get('/', (req,res) => {
                return res.status(httpStatus.OK).json({"message" : "welcome"});
            });
            app.get('/reddit/search/posts/:searchTerm', async (req,res,next) => {
                try {
                    const searchTerm = req.params.searchTerm;
                    const baseUrl = `https://www.reddit.com/`;
                    const url = `search.json`;
                    const option = {
                        method: "GET",
                        baseURL: baseUrl,
                        url: url,
                        params : {
                            'q': searchTerm, 'limit': 300, 'sort': 'new'
                        },
                    };
                    if(process.env.PROXY) {
                        Object.defineProperty(option,'proxy', {
                            configurable: true,
                            enumerable: true,
                            writable:true,
                            value:{
                                protocol: process.env.PROXY_PROTOCOL,
                                host: process.env.PROXY_HOST,
                                port : process.env.PROXY_PORT
                            }
                        });
                    }
                    const response = await axios(option);
                    if(response.status === 200) {
                        const searchResult = response.data.data.children.map(d => {
                            return d.data;
                        });
                        const insertionResult = await req.db.collection("posts").insertMany(searchResult);
                        const searchHistoryInsertionResult = await req.db.collection("search_history").insertOne({
                            search : searchTerm,
                            created_at : Date.now(),
                            result : searchResult.length,
                            search_ids : Object.values(insertionResult.insertedIds)
                        });
                        return res.status(httpStatus.OK).json({searchHistoryInsertionResult, dbResult: insertionResult, body : searchResult});
                    }else {
                        return next(new Error(`invalid request ${response.status}`));
                    }
                }catch(err) {
                    return next(err);
                }

            });
            app.get('/reddit/me/info', async (req,res,next) => {
                try {
                    const option = {
                        method: "GET",
                        baseURL: oauthUrl,
                        url : `api/v1/me`,
                        headers : {
                            "Authorization" : `Bearer ${accessToken}`,
                            "User-Agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                        }
                    }
                    if(process.env.PROXY) {
                        Object.defineProperty(option,'proxy', {
                            configurable: true,
                            enumerable: true,
                            writable:true,
                            value:{
                                protocol: process.env.PROXY_PROTOCOL,
                                host: process.env.PROXY_HOST,
                                port : process.env.PROXY_PORT
                            }
                        });
                    }
                    const response = await axios(option);
                    if(response.status === 200) {
                        const result = await req.db.collection('admin').insertOne(response.data);
                        return res.status(httpStatus.OK).json({dbResult : result, body : response.data});
                    }else {
                        return next(new Error(`invalid request ${response.status}`));
                    }

                }catch(error) {
                    console.log(error);
                    return next(error);
                }
            });
            app.get("/reddit/search/user/:user", async (req,res,next) => {
                try {
                    const userSearch = req.params.user;
                    const option = {
                        method: "GET",
                        baseURL: oauthUrl,
                        url : `/users/search`,
                        params : {
                            'q': userSearch, 'limit': 150, 'sort': 'relevance'
                        },
                        headers : {
                            "Authorization" : `Bearer ${accessToken}`,
                            "User-Agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                        }
                    };
                    if(process.env.PROXY) {
                        Object.defineProperty(option,'proxy', {
                            configurable: true,
                            enumerable: true,
                            writable:true,
                            value:{
                                protocol: process.env.PROXY_PROTOCOL,
                                host: process.env.PROXY_HOST,
                                port : process.env.PROXY_PORT
                            }
                        });
                    }
                    const response = await axios(option);
                    if(response.status === 200) {
                        const users = response.data.data.children.map(d => {
                            return d.data;
                        });
                        const insertionResult = await req.db.collection("users").insertMany(users);
                        return res.status(httpStatus.OK).json({dbResult : insertionResult, body : users});
                    }else {
                        return next(new Error(`invalid request ${response.status}`));
                    }
                } catch (error) {
                    return next(error);
                }
            });
            app.get("/reddit/search/:searchTerm", async (req,res,next) => {
                try {
                    const searchTerm = req.params.searchTerm;
                    const option = {
                        method: "GET",
                        baseURL: oauthUrl,
                        url : `subreddits/search`,
                        params : {
                            'q': searchTerm, 'limit': 300, 'sort': 'relevance'
                        },
                        headers : {
                            "Authorization" : `Bearer ${accessToken}`,
                            "User-Agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                        }
                    };
                    if(process.env.PROXY) {
                        Object.defineProperty(option,'proxy', {
                            configurable: true,
                            enumerable: true,
                            writable:true,
                            value:{
                                protocol: process.env.PROXY_PROTOCOL,
                                host: process.env.PROXY_HOST,
                                port : process.env.PROXY_PORT
                            }
                        });
                    }
                    const response = await axios(option);
                    if(response.status === 200) {
                        const searchResult = response.data.data.children.map(d => {
                            return d.data;
                        });
                        const insertionResult = await req.db.collection("searches").insertMany(searchResult);
                        // await req.db.collection("search_history").insert({
                        //     search : searchTerm,
                        //     created_at : new Date.now(),
                        //     result : searchResult.length,
                        //     search_ids : insertionResult.insertedIds
                        // });
                        return res.status(httpStatus.OK).json({dbResult: insertionResult, body : searchResult});
                    }else {
                        return next(new Error(`invalid request ${response.status}`));
                    }
                }catch(err) {
                    return next(err);
                }
            });
            app.delete("/reddit/search/history", async (req,res,next) => {
                try {
                    const {historyOptions} = req.body;
                    if(historyOptions.drop) {
                        const deletionResult = await req.db.collection("search_history").drop({
                            writeConcern : true
                        });
                        return res.status(200).json({ ack : deletionResult});
                    }else {
                        const {ids} = req.body;
                        const deletionResult = await req.db.collection("search_history").deleteMany({ "_id" : {
                            "$in" : ids
                        }});
                        return res.status(200).json({ ack: deletionResult});
                    }
                } catch (error) {
                    return next(error);
                }
            })
            app.use((req,res,next) => {
                let error = new Error("NOT FOUND!");
                error.status = 404;
                return next(error);
            });
            app.use((err,req,res,next) => {
                if(err.status === 404) {
                    return res.status(httpStatus.NOT_FOUND).json({error: err.message});
                }else {
                    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({error: err.message});
                }
            });
            return resolve(app);
        } catch (error) {
            return reject(error);
        }
    });
}

export { initApp }