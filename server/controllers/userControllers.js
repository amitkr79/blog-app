const User = require("../models/userModel.js");
const HttpError = require("../models/errorModel")
const fs = require('fs')
const path = require('path')
const {v4: uuid} = require('uuid')

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")



// ------------Register a new user-----------
//post : api/users/register
// UNPROTECTED


const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        if (!name || !email || !password) {
            throw new HttpError("Fill in all fields.", 422);
        }

        const newEmail = email.toLowerCase(); // Fixed typo
        const emailExists = await User.findOne({ email: newEmail });

        if (emailExists) {
            throw new HttpError("Email is already exists.", 422);
        }

        if (password.trim().length < 6) {
            throw new HttpError("Password should be at least 6 characters.", 422);
        }

        if (password !== password2) {
            throw new HttpError("Passwords do not match.", 422);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        const newUser = await User.create({ name, email: newEmail, password: hashedPass });
        res.status(201).json(newUser);

    } catch (error) {
        // Instead of returning next, handle the response here
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};













// ------------Login user-----------
//post : api/users/login
// UNPROTECTED

const loginUser = async (req,res,next)=> {
    try {
        const {email ,password} = req.body;
        if(!email || !password){
            throw new HttpError("Please Enter Email and Password.",422)
        }
        
        const newEmail = email.toLowerCase();

        const user = await User.findOne({email:newEmail})

        if(!user){
            throw new HttpError("Invalid credentials.",422)
        }

        const comparePass = await bcrypt.compare(password,user.password)
        if(!comparePass){
            throw new HttpError("Invalid credentials. ",422)
        }

        const {_id: id,name} = user;
        const token = jwt.sign({id,name},process.env.JWT_SECRET,{expiresIn: "1d"})
        
        res.status(200).json({token,id,name})


    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
        
    }
}






// ------------user porfile-----------
//post : api/users/:id
// UNPROTECTED

const getUser = async (req,res,next)=> {
    try {
        const {id} = req.params;
        const user = await User.findById(id).select('-password');

        if(!user) {
            throw new HttpError("User not found.",404);
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}













// ------------change user profile-----------
//post : api/users/change-avatar
// PROTECTED

const changeAvatar = async (req,res,next)=> {

    try {
        if(!req.files.avatar){
            throw new HttpError("Please choose an image.", 422)

        }

        //find user from databse
        const user = await User.findById(req.user.id)
        //delete old avatar if exists
        if(user.avatar){
            fs.unlink(path.join(__dirname,'..', 'uploads',user.avatar),(err)=>{
                if(err) {

                    return next(new HttpError(err))
                }
            })
        }

        const {avatar} = req.files;
        //check file size
        if(avatar.size>500000){
            throw new HttpError("Profile picture too big. Should be less than 500kb.",422)

        }

        let fileName;
        fileName = avatar.name;
        let splittedFilename = fileName.split('.')
        let newFileName = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length -1]
        
        avatar.mv(path.join(__dirname,'..' , 'uploads',newFileName),async (err)=>{
            if(err){
                throw new HttpError(err);
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id,{avatar: newFileName},{new: true})

            if(!updatedAvatar){
                throw new HttpError("Avatar couldn't be changed. ",422)
            }
            res.status(200).json(updatedAvatar)

        })
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
        
    }

}














// ------------edit user detail-----------
//post : api/users/edit-user
// PROTECTED

const editUser = async (req,res,next)=> {
    try {
        const{name,email,currentPassword,newPassword,newConfirmPassword} = req.body;

        if(!name || !email || !currentPassword || !newPassword )
        {
            return next(new HttpError("Fill in all fields.", 422))
        }

        // get user from database 
        const user = await User.findById(req.user.id);
        if(!user){
            return next(new HttpError("User not found.", 422))
        }

        // make sure new email doen't already exist

        const emailExist = await User.findOne({email});
        // we want to update other details with/without changing the email (which is a unique beacuser we user it to login)

        if(emailExist && (emailExist._id != req.user.id)){
            return next(new HttpError("Email already exist.", 422))
        }

        //compare current pass to db pass

        const validateUserPass = await bcrypt.compare(currentPassword,user.password);

        if(!validateUserPass){
            return next(new HttpError("Invalid current password.", 422))
        }

        // compare new password
        if(newPassword !== newConfirmPassword) {
            return next(new HttpError("New passwords does not match.", 422))
            
        }
        
        // hash new password

        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword,salt);

        // update user info in db
        const newInfo = await User.findByIdAndUpdate(req.user.id,{name,email,password: hash}, {new: true})

        res.status(200).json(newInfo);






    } catch (error) {
        return next(new HttpError(error))
        
    }
}














// ------------get authors-----------
//post : api/users/register
// UNPROTECTED

const getAuthors = async (req,res,next)=> {
    try {
        const authors = await User.find().select('-password');
        res.json(authors);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
        
    }
}
















module.exports = {registerUser,loginUser,getUser,changeAvatar,editUser,getAuthors}