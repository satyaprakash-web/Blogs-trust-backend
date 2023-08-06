const mongoose = require("mongoose");
require('dotenv').config();


const url = process.env.MONGO_URL;
mongoose.connect(url);

mongoose.connection
    .once('open', function () {
        console.log('Successfully connected to Database Category collection ...');
    })
    .on('error', function (err) {
        console.log(err);
});



const categorySchema = new mongoose.Schema({
    name :{
        type :String,
        required :true
    }
}, 
// to store time by default
{timestamps : true} );

const Category = new mongoose.model("Category", categorySchema);


module.exports = Category;