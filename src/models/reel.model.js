const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const reelSchema = new Schema({
    cdnUrl: {
        type: String,
        required: true,
        trim: true,
    },
    posterUrl:{
        type: String,
    },
    title : {
        type: String,
        required: true,
        trim: true,
        maxLength: 100,
    },
    caption : {
        type: String,
        required: true,
        trim: true,
        maxLength: 200,
    },
    liked: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const reelModel = mongoose.model('reels', reelSchema);

module.exports = reelModel;