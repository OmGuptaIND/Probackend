"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolvers = void 0;
const User_1 = require("../enteties/User");
const type_graphql_1 = require("type-graphql");
const argon2_1 = __importDefault(require("argon2"));
const constant_1 = require("../constant");
const UsernamePasswordInput_1 = require("./UsernamePasswordInput");
const validateRegister_1 = require("../utils/validateRegister");
const nodemailer_1 = require("../utils/nodemailer");
const uuid_1 = require("uuid");
let FieldError = class FieldError {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], FieldError.prototype, "field", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], FieldError.prototype, "message", void 0);
FieldError = __decorate([
    type_graphql_1.ObjectType()
], FieldError);
let UserResponse = class UserResponse {
};
__decorate([
    type_graphql_1.Field(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], UserResponse.prototype, "errors", void 0);
__decorate([
    type_graphql_1.Field(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], UserResponse.prototype, "user", void 0);
UserResponse = __decorate([
    type_graphql_1.ObjectType()
], UserResponse);
let UserResolvers = class UserResolvers {
    me({ req, em }) {
        if (!req.session.userId) {
            return null;
        }
        return em.findOne(User_1.User, { id: req.session.userId });
    }
    async register(options, { em, req }) {
        const errors = validateRegister_1.validateRegister(options);
        if (errors)
            return { errors };
        const hashedPassword = await argon2_1.default.hash(options.password);
        const user = em.create(User_1.User, { email: options.email, username: options.username, password: hashedPassword });
        try {
            await em.persistAndFlush(user);
        }
        catch (err) {
            if (err.code === '23505') {
                return {
                    errors: [{
                            message: "Username already taken",
                            field: "username",
                        }]
                };
            }
        }
        req.session.userId = user.id;
        return {
            user
        };
    }
    async login(usernameOrEmail, password, { em, req }) {
        const user = await em.findOne(User_1.User, usernameOrEmail.includes('@')
            ? { email: usernameOrEmail }
            : { username: usernameOrEmail });
        if (!user) {
            return {
                errors: [
                    {
                        field: 'usernameOrEmail',
                        message: 'Username Doesnt Exist'
                    }
                ]
            };
        }
        const valid = await argon2_1.default.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: 'password',
                        message: 'Password is Incorrect'
                    }
                ]
            };
        }
        req.session.userId = user.id;
        return { user };
    }
    logout({ req, res }) {
        return new Promise((resolve) => req.session.destroy((err) => {
            res.clearCookie(constant_1.COOKIE_NAME);
            if (err) {
                console.log(err);
                resolve(false);
                return;
            }
            resolve(true);
        }));
    }
    async forgotPassword(email, { em, redis }) {
        const user = await em.findOne(User_1.User, { email: email });
        if (!user) {
            return true;
        }
        const token = uuid_1.v4();
        await redis.set(constant_1.FORGOT_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 60 * 24 * 3);
        await nodemailer_1.sendEmail(email, `<a target="_blank" href = "http://localhost:3000/change-password/${token}">Reset Password </a>`);
        return true;
    }
    async changePassword(newPassword, token, { req, em, redis }) {
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: "newPassword",
                        message: "Password length should be more than 2"
                    }
                ]
            };
        }
        const userId = await redis.get(constant_1.FORGOT_PASSWORD_PREFIX + token);
        if (!userId) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "token Expired"
                    }
                ]
            };
        }
        const user = await em.findOne(User_1.User, { id: parseInt(userId) });
        if (!user) {
            return {
                errors: [
                    {
                        field: "username",
                        message: "User No Longer Exists"
                    }
                ]
            };
        }
        user.password = await argon2_1.default.hash(newPassword);
        em.persistAndFlush(user);
        redis.del(constant_1.FORGOT_PASSWORD_PREFIX + token);
        req.session.userId = user.id;
        return { user };
    }
};
__decorate([
    type_graphql_1.Query(() => User_1.User, { nullable: true }),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolvers.prototype, "me", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg('options', () => UsernamePasswordInput_1.UsernamePasswordInput)),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UsernamePasswordInput_1.UsernamePasswordInput, Object]),
    __metadata("design:returntype", Promise)
], UserResolvers.prototype, "register", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg('usernameOrEmail')),
    __param(1, type_graphql_1.Arg('password')),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolvers.prototype, "login", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolvers.prototype, "logout", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Arg('email')),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserResolvers.prototype, "forgotPassword", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg("newPassword")),
    __param(1, type_graphql_1.Arg('token')),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolvers.prototype, "changePassword", null);
UserResolvers = __decorate([
    type_graphql_1.Resolver()
], UserResolvers);
exports.UserResolvers = UserResolvers;
//# sourceMappingURL=user.js.map