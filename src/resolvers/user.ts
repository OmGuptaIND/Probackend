import { User } from "../enteties/User";
import { Mutation, Resolver, InputType, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import {MyContext} from '../types';
import argon2 from 'argon2';
import { COOKIE_NAME } from "../constant";

@InputType()
class UsernamePasswordInput{
    @Field()
    username:string;

    @Field()
    password:string;
}

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
    @Mutation(()=>Boolean)
    forgotPassword(
        @Ctx() {} : MyContext
    ){

    }
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
        if( options.username.length <= 2 )
        {
            return { 
                errors:[{message: "Username must be at least 3 characters", field: "username"}]
            }
        }
        if( options.password.length <= 2)
        {
            return { 
                errors:[{message: "Password must be at least 3 characters", field:'password'}]
            }
        }
        const hashedPassword = await argon2.hash(options.password);
        const user = em.create(User, {username: options.username, password: hashedPassword});
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
        @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
        @Ctx() {em ,req} : MyContext
    ){
        const user = await em.findOne(User, {username: options.username});
        if( !user ){
            return{
                errors:[
                    {
                        field: 'username',
                        message: 'Username Doesnt Exist'
                    }
                ]
            }
        }
        const valid = await argon2.verify(user.password, options.password);
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
}