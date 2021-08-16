"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const constant_1 = require("./constant");
const Post_1 = require("./enteties/Post");
const User_1 = require("./enteties/User");
exports.default = {
    migrations: {
        path: node_path_1.default.join(__dirname, './migrations'),
        pattern: /^[\w-]+\d+\.[tj]s$/,
    },
    entities: [Post_1.Post, User_1.User],
    dbName: 'lireddit',
    type: "postgresql",
    debug: !constant_1.__prod__,
};
//# sourceMappingURL=mikro-orm.config.js.map