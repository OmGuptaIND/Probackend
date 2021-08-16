"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20210816162638 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20210816162638 extends migrations_1.Migration {
    async up() {
        this.addSql('create table "user" ("id" serial primary key, "email" text not null, "username" text not null, "password" text not null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);');
        this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');
        this.addSql('alter table "user" add constraint "user_username_unique" unique ("username");');
        this.addSql('create table "post" ("id" serial primary key, "title" text not null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);');
    }
}
exports.Migration20210816162638 = Migration20210816162638;
//# sourceMappingURL=Migration20210816162638.js.map