"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = void 0;
const validateRegister = (options) => {
    if (!options.email.includes("@")) {
        return [{ message: "Invalid Email.", field: "email" }];
    }
    if (options.username.includes("@")) {
        return [
            { message: "Invalid Username Cannot include '@'.", field: "username" },
        ];
    }
    if (options.username.length <= 2) {
        return [
            {
                message: "Username must be at least 3 characters",
                field: "username",
            },
        ];
    }
    if (options.password.length <= 2) {
        return [
            {
                message: "Password must be at least 3 characters",
                field: "password",
            },
        ];
    }
    return null;
};
exports.validateRegister = validateRegister;
//# sourceMappingURL=validateRegister.js.map