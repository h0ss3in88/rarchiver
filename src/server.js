import express from "express"
import logger from "morgan"
import responseTime from "response-time"
import compression from "compression"
import httpStatus from "http-status"
import axios from "axios"

const initApp = function({accessToken,db}) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(accessToken);
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
            app.get('/reddit/me/info', async (req,res,next) => {
                try {
                    const response = await axios({
                        method: "GET",
                        baseURL: oauthUrl,
                        url : `api/v1/me`,
                        proxy: {
                            protocol: "http",
                            host: "127.0.0.1",
                            port : 8580
                        },
                        headers : {
                            "Authorization" : `Bearer ${accessToken}`,
                            "User-Agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                        }
                    });
                    if(response.status === 200) {
                        return res.status(httpStatus.OK).json({accessToken, body : response.data});
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
                    const response = await axios({
                        method: "GET",
                        baseURL: oauthUrl,
                        url : `/users/search`,
                        proxy: {
                            protocol: "http",
                            host: "127.0.0.1",
                            port : 8580
                        },
                        params : {
                            'q': userSearch, 'limit': 5, 'sort': 'relevance'
                        },
                        headers : {
                            "Authorization" : `Bearer ${accessToken}`,
                            "User-Agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                        }
                    });
                    if(response.status === 200) {
                        return res.status(httpStatus.OK).json({body : response.data});
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
                    const response = await axios({
                        method: "GET",
                        baseURL: oauthUrl,
                        url : `subreddits/search`,
                        params : {
                            'q': searchTerm, 'limit': 1, 'sort': 'relevance'
                        },
                        proxy: {
                            protocol: "http",
                            host: "127.0.0.1",
                            port : 8580
                        },
                        headers : {
                            "Authorization" : `Bearer ${accessToken}`,
                            "User-Agent": `${process.env.REDDIT_APP_NAME} by ${process.env.REDDIT_USER_NAME}` 
                        }
                    });
                    if(response.status === 200) {
                        return res.status(httpStatus.OK).json({body : response.data});
                    }else {
                        return next(new Error(`invalid request ${response.status}`));
                    }
                }catch(err) {
                    return next(err);
                }
            });
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