import 'reflect-metadata';
import { MikroORM } from "@mikro-orm/core";
import { COOKIE_NAME, __prod__ } from "./constant";
import microConfig from './mikro-orm.config';
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {buildSchema} from 'type-graphql'
import { HelloResolvers } from "./resolvers/hello";
import { PostResolvers } from './resolvers/post';
// import { Post } from './enteties/Post';
import { UserResolvers } from './resolvers/user';
import cors from "cors";

import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
// import { sendEmail } from './utils/nodemailer';

const main = async () => {
    // sendEmail("bob@bob.com", "hello guys its me");
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up();
    // const post = orm.em.create(Post, {title: "MY FIRST POST"});
    // await orm.em.persistAndFlush(post);
    const app = express();
    const RedisStore = connectRedis(session)
    const redisClient = redis.createClient();
    app.use(cors({
        origin:"http://localhost:3000",
        credentials:true
    }))
    app.use(
    session({
        name:COOKIE_NAME,
        store: new RedisStore({ client: redisClient,
            disableTouch:true,
        }),
        cookie:{
            maxAge:1000*60*60*24*365*10,//10 years,
            httpOnly:true,
            sameSite:'lax',
            secure: __prod__
        },
        saveUninitialized: false,
        secret: 'keyboard cat',
        resave: false,
    })
    )
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers:[HelloResolvers, PostResolvers, UserResolvers ],
            validate:false
        }),
        plugins:[
            ApolloServerPluginLandingPageGraphQLPlayground({}),
        ],
        // introspection: true,
        context: ({req, res}) => ({em : orm.em, req, res}),
    })
    await apolloServer.start();
    apolloServer.applyMiddleware({app, cors:false});
    app.get('/', (_, res)=>res.send('Connected'))
    app.listen(4000, () => {
        console.log("SERVER STARTED ON PORT: 4000");
    });
    // const posts = await orm.em.find(Post, {});
    // console.log(posts);
}
main().catch(err => console.log(err));