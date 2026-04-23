const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    
    name : {
        type : String ,
        required : true
    },

    email : {
        type : String , 
        required : true,
        unique : true,
        lowercase : true,
        trim : true
    },

    password : {
        type : String , 
        required : true,
    }
    ,
    likedReels: [{
        reelId: {
            type: Schema.Types.ObjectId,
            ref: 'reels',
            required: true
        },
        likedAt: {
            type: Date,
            default: Date.now
        }
    }]

});

const userModel = mongoose.model('users' , userSchema);

module.exports = userModel;

