var express = require('express');
var router = express.Router();
const Response = require("../lib/Response");
const Users =  require("../db/modules/Users");
const CustomError = require('../lib/Error');
const Enume = require('../config/Enume');
const UserRoles = require('../db/modules/UserRoles');
const Roles = require('../db/modules/Roles');
const bcrypt = require("bcrypt-nodejs");
const is = require("is_js");
const config = require('../config');
const jwt = require("jwt-simple");
const auth = require("../lib/auth")();
const i18n = new (require("../lib/i18n"))(config.DEFAULT_LANG);

router.post("/register", async (req,res, next) => {
  let body = req.body;
  try{

    let user = await Users.findOne({});

    if(user) {
      return res.sendStatus(Enume.HTTP_CODES.NOT_FOUND);
    }

    if(!body.email) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST,"Validation Error!", "email field must be filled");

    if(is.not.email(body.email)) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST,"Validation Error!", "email field must be an email format");

    if(!body.password) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST,"Validation Error!", "password field must be filled");

    if(body.password.length < Enume.PASS_LENGTH) {
      throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, "Validation Error!", "password length must be greater than " + Enume.PASS_LENGTH);
    }

    let password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

    let createdUser = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number
    });

    let role = await Roles.create({
      role_name : Enume.SUPER_ADMIN,
      is_active: true,
      created_by: createdUser._id
    });

    await UserRoles.create({
      role_id: role._id,
      user_id: createdUser._id
    });

    res.status(Enume.HTTP_CODES.CREATED).json(Response.successResponse({success: true}, Enume.HTTP_CODES.CREATED));

  }catch(err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/auth", async (req,res) => {
  try{

    let {email, password} = req.body;

    Users.validateFieldsBeforeAuth(email, password);

    let user = await Users.findOne({ email });

    if (!user) throw new CustomError(Enume.HTTP_CODES.UNAUTHORIZED, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.AUTH_ERROR", req.user.language));

    if (!user.validPassword(password)) throw new CustomError(Enume.HTTP_CODES.UNAUTHORIZED, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.AUTH_ERROR", req.user.language));

    let payload = {
      id: user._id,
      exp: parseInt(Date.now() / 1000) * config.JWT.EXPIRE_TIME
    }

    let token = jwt.encode(payload, config.JWT.SECRET);

    let userData = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name
    }

    res.json(Response.successResponse({ token, user: userData }));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }

});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get('/'/*, auth.checkRoles("user_view")*/, async (req, res, next) => {
  try{
    let users = await Users.find({});

    res.json(Response.successResponse(users));
  }catch(err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse).json(errorResponse);
  }
});

router.post("/add", auth.checkRoles("user_add"), async (req,res, next) => {
  let body = req.body;
  try{

    if(!body.email) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["email"]));

    if(is.not.email(body.email)) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.EMAIL_FORMAT_ERROR", req.user.language));

    if(!body.password) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["password"]));

    if(body.password.length < Enume.PASS_LENGTH) {
      throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.PASSWORD_LENGTH_ERROR", req.user.language, [Enume.PASS_LENGTH]));
    }

    if(!body.roles || !Array.isArray(body.roles) || body.roles.length == 0) {
      throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_TYPE", req.user.language, ["roles", "Array"]));
    }

    let roles = await Roles.find({_id: {$in: body.roles}});

    if(roles.length == 0) {
      throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_TYPE", req.user.language, ["roles", "Array"]));
    }
    
    let password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

    let user = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number
    });

    for(let i=0;i<roles.length;i++) {
      await UserRoles.create({
        role_id: roles[i]._id,
        user_id: user._id
      });
    }

    res.status(Enume.HTTP_CODES.CREATED).json(Response.successResponse({success: true}, Enume.HTTP_CODES.CREATED));

  }catch(err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/update", auth.checkRoles("user_update") , async (req,res) => {
  try{
    let body = req.body;
    let updates= {};

    if(!body._id) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));

    if(body.password && body.password.length >= Enume.PASS_LENGTH) {
      updates.password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);
    }

    if(typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if(body.first_name) updates.first_name = body.first_name;
    if(body.last_name) updates.last_name = body.last_name;
    if(body.phone_number) updates.phone_number = body.phone_number;

    if(Array.isArray(body.roles) && body.roles.length > 0) {

      let userRoles = await UserRoles.find({user_id: body._id});

      let removedRoles = userRoles.filter(x => !body.roles.includes(x.role_id)); 
      let newRoles  = body.roles.filter(x => !userRoles.map(r => r.role_id).includes(x));

      if(removedRoles.length > 0) {
                      await UserRoles.deleteMany({_id: {$in: removedRoles.map(x => x._id.toString())}});
                  }
      
                  if(newRoles.length > 0) {
                      for(let i=0;i<newRoles.length;i++) {
                          let userRole = new UserRoles({
                              role_id: newRoles[i],
                              user_id: body._id
                          });
      
                          await userRole.save();
                      }
                  }

    }

    await Users.updateOne({_id: body._id}, updates);

    res.json(Response.successResponse({success: true}));

  } catch(err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/delete", auth.checkRoles("user_delete"), async (req,res) => {
  try{
    let body = req.body;

    if(!body._id) throw new CustomError(Enume.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));

    await Users.deleteOne({_id: body._id});

    await UserRoles.deleteMany({user_id: body._id});

    res.json(Response.successResponse({success: true}));

  }catch(err){
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;
