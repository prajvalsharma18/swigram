const userModel = require('../models/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function signTokenForUser(user) {
    if (!process.env.JWT_SECRET) {
        return null;
    }
    return jwt.sign(
        { email: user.email, _id: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
}

const signup = async (req , res) =>{
    try{

     const{name , email , password} = req.body;
     const normalizedEmail = String(email).trim().toLowerCase();

     const user = await userModel.findOne({ email: normalizedEmail });

     if(user){
        return res.status(409)
        .json({message : "user already exists , you can login" , success : false});   
     }

     const UserModel = new userModel({
        name , email: normalizedEmail , password
     });

     // WILL HASH PASS BEFORE SAVING IT TO DB
     UserModel.password = await bcrypt.hash(password , 10);
     await UserModel.save();

     const token = signTokenForUser(UserModel);
     if (!token) {
        return res.status(500).json({
            message: 'Server misconfiguration: JWT_SECRET is not set.',
            success: false
        });
     }

      res.status(201).json({
        message : "user signed up successfully" ,
        success : true,
        token,
        user: {
            _id: UserModel._id,
            name: UserModel.name,
            email: UserModel.email
        }
      }); 

    }
    catch(err){
        console.error('Signup error:', err);
        res.status(500).json({message : "internal server error" , success : false});
    }
};

const login = async (req , res) =>{
    try{

     const{email , password} = req.body;
     const normalizedEmail = String(email).trim().toLowerCase();

     const user = await userModel.findOne({ email: normalizedEmail });

     const errorMsg = "invalid credentials, please check";

     if(!user){
        return res.status(403)
        .json({message : errorMsg , success : false});   
     }

     const isPassword = await bcrypt.compare(password , user.password);

     if(!isPassword){
        return res.status(403)
        .json({message : errorMsg , success : false});   
     }

      const token = signTokenForUser(user);
      if (!token) {
        return res.status(500).json({
            message: 'Server misconfiguration: JWT_SECRET is not set.',
            success: false
        });
      }

       res.status(200).json({
         message : "user logged in successfully" ,
         success : true,
         token,
         user: {
            _id: user._id,
            name: user.name,
            email: user.email
         }
        }); 

    }
    catch(err){
        res.status(500).json({message : "internal server error" , success : false});
    }
};

const me = async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists.'
            });
        }
        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Auth me error:', err);
        res.status(500).json({ message: 'internal server error', success: false });
    }
};

module.exports = {
    signup,
    login,
    me
};