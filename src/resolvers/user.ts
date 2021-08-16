import { User } from "../enteties/User";
import { Mutation, Resolver, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import {MyContext} from '../types';
import argon2 from 'argon2';
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constant";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/nodemailer";
import {v4} from 'uuid';
@ObjectType()
class FieldError{
    @Field()
    field:string;

    @Field()
    message:string;
}

@ObjectType()
class UserResponse{
    @Field(()=>[FieldError], {nullable : true})
    errors ?: FieldError[];

    @Field(() => User, {nullable : true})
    user?:User;
}

@Resolver()
export class UserResolvers{
    @Query(()=> User, {nullable : true})
    me(
        @Ctx() {req, em}: MyContext
    ){        
        if( !req.session!.userId ){
            return null;
        }
        return em.findOne(User, {id: req.session!.userId})
    }
    
    @Mutation(()=>UserResponse)
    async register(
        @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
        @Ctx() {em ,req} : MyContext
    ):Promise<UserResponse> {
        const errors = validateRegister(options);
        if(errors) return {errors};

        const hashedPassword = await argon2.hash(options.password);
        const user = em.create(User, {email:options.email, username: options.username, password: hashedPassword});
        try{
            await em.persistAndFlush(user);
        }catch(err){
            if( err.code === '23505' )
            {
                return{
                    errors:[{
                        message: "Username already taken",
                        field: "username",
                    }]
                }
            }
        }
        req.session.userId = user.id; 
        return {
            user
        };
    }

    @Mutation(()=>UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() {em ,req} : MyContext
    ){
        const user = await em.findOne(User, 
            usernameOrEmail.includes('@') 
            ? {email: usernameOrEmail} 
            : {username:usernameOrEmail}
        );
        if( !user ){
            return{
                errors:[
                    {
                        field: 'usernameOrEmail',
                        message: 'Username Doesnt Exist'
                    }
                ]
            }
        }
        const valid = await argon2.verify(user.password, password);
        if(!valid){
            return{
                errors:[
                    {
                        field: 'password',
                        message: 'Password is Incorrect'
                    }
                ]
            }
        }        
        req.session.userId = user.id;        
        return { user };
    }

    @Mutation(()=>Boolean)
    logout(
        @Ctx() {req, res} : MyContext
    ){
        return new Promise((resolve) => req.session.destroy((err) => {
            res.clearCookie(COOKIE_NAME);
            if(err){
                console.log(err);
                resolve(false);
                return;
            }
            resolve(true);
        }))
    }

    @Mutation(()=>Boolean)
    async forgotPassword(
        @Arg('email') email : string,
        @Ctx() {em, redis} : MyContext
    ){
        const user = await em.findOne(User, {email:email});
        if(!user){
            return true;
        }
        const token = v4();
        await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'ex', 1000*60*60*24*3);
        await sendEmail(
            email,
            `<a target="_blank" href = "http://localhost:3000/change-password/${token}">Reset Password </a>`
        );
        return true;
    }

    @Mutation(()=>UserResponse)
    async changePassword(
        @Arg("newPassword") newPassword : string,
        @Arg('token') token : string,
        @Ctx() {req, em, redis} : MyContext
    ):Promise<UserResponse> {
        if(newPassword.length <= 2){
            return{
                errors:[
                    {
                        field:"newPassword",
                        message:"Password length should be more than 2"
                    }
                ]
            }
        }

        const userId = await redis.get(FORGOT_PASSWORD_PREFIX + token);
        if(!userId){
            return{
                errors:[
                    {
                        field:"token",
                        message:"token Expired"
                    }
                ]
            }
        }
        const user = await em.findOne(User, {id:parseInt(userId)})
        if(!user){
            return{
                errors:[
                    {
                        field:"username",
                        message:"User No Longer Exists"
                    }
                ]
            }
        }
        user.password = await argon2.hash(newPassword);
        em.persistAndFlush(user);
        redis.del(FORGOT_PASSWORD_PREFIX + token);
        req.session.userId = user.id;
        return {user};
    }
}