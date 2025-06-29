const mongoose = require("mongoose");
const Enume = require("../../config/Enume");
const is = require("is_js");
const CustomError = require("../../lib/Error");
const bcrypt = require("bcrypt-nodejs");

const schema = mongoose.Schema({
    email: {type:String, required: true},
    password: {type:String, required: true},
    is_active: {type:Boolean, default: true},
    first_name: String,
    last_name: String,
    phone_number: String
},{
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})

class Users extends mongoose.Model {

    validPassword(password) {
        return bcrypt.compareSync(password, this.password);
    }

    static validateFieldsBeforeAuth(email, password) {
        if(typeof password !== "string" || password.length < Enume.PASS_LENGTH || is.not.email(email)) {
            throw new CustomError(Enume.HTTP_CODES.UNAUTHORIZED, "Validation Error" , "Email or Password wrong");
        } else {
            return null;
        }
    }

}

schema.loadClass(Users);
module.exports = mongoose.model("users",schema);
