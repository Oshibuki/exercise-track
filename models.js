var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const shortid = require('shortid');

var exerciseSchema = new Schema({
    description: {
        type: String,
        required: true,
        maxlength: [20, 'description too long']
    },
    duration: {
        type: Number,
        min: [1,'duration too short'],
        required: true
    },
    date: {
        type: Date,
        required: [true, 'Created date is required']
    }
});

var userSchema = new Schema({
    _id: {
        'type': String,
        'default': shortid.generate
    },
    username: {
        type: String,
        required: [true, 'Username is required']
    },
    exercises: [exerciseSchema],
});


module.exports = mongoose.model("User", userSchema);