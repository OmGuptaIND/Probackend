import { MikroORM } from "@mikro-orm/core";
import path from "node:path";
import { __prod__ } from "./constant";
import { Post } from "./enteties/Post";
import { User } from "./enteties/User";

export default {
    migrations:{
        path: path.join(__dirname, './migrations'), // path to the folder with migrations
        pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
    },
    entities:[Post, User],
    dbName:'lireddit',
    type:"postgresql",
    debug: !__prod__,
} as Parameters< typeof MikroORM.init>[0];