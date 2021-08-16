"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@mikro-orm/core");
const constant_1 = require("./constant");
const mikro_orm_config_1 = __importDefault(require("./mikro-orm.config"));
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const type_graphql_1 = require("type-graphql");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const cors_1 = __importDefault(require("cors"));
const ioredis_1 = __importDefault(require("ioredis"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const apollo_server_core_1 = require("apollo-server-core");
const main = async () => {
    const orm = await core_1.MikroORM.init(mikro_orm_config_1.default);
    await orm.getMigrator().up();
    const app = express_1.default();
    const RedisStore = connect_redis_1.default(express_session_1.default);
    const redis = new ioredis_1.default();
    app.use(cors_1.default({
        origin: "http://localhost:3000",
        credentials: true
    }));
    app.use(express_session_1.default({
        name: constant_1.COOKIE_NAME,
        store: new RedisStore({ client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: 'lax',
            secure: constant_1.__prod__
        },
        saveUninitialized: false,
        secret: 'keyboard cat',
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await type_graphql_1.buildSchema({
            resolvers: [hello_1.HelloResolvers, post_1.PostResolvers, user_1.UserResolvers],
            validate: false
        }),
        plugins: [
            apollo_server_core_1.ApolloServerPluginLandingPageGraphQLPlayground({}),
        ],
        context: ({ req, res }) => ({ em: orm.em, req, res, redis }),
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({ app, cors: false });
    app.get('/', (_, res) => res.send('Connected'));
    app.listen(4000, () => {
        console.log("SERVER STARTED ON PORT: 4000");
    });
};
main().catch(err => console.log(err));
//# sourceMappingURL=index.js.map