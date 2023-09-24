const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
require("dotenv").config();
const User = require("./db/user");
const Post = require("./db/post");
const Category = require("./db/category");
const bcrypt = require('bcryptjs');
const multer = require("multer");
const path = require("path");
const cors = require("cors");


const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
// make image folder public
app.use("/images", express.static(path.join(__dirname, "/images")));


//set image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images");
    },
    filename: (req, file, cb) => {
        cb(null, req.body.name);
    },
});

const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("file"), (req, res) => {
    res.status(200).json("File has been uploaded");
});


// ********************* Authentication******************

//register
app.post('/api/auth/register', async (req, res) => { 
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(req.body.password, salt);
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPass,
        });

        const user = await newUser.save();
        res.status(200).json({success:true,user});
    } catch (err) {
        // same username or email may exists
        res.status(500).json({success:false,err});
    }
});


// login
app.post('/api/auth/login', async (req, res) => {
    try {
        // with username and password
        let user = await User.findOne({ username: req.body.username });
        if (!user) {
            // means that email dont exists 
            console.log("Please login with correct credentials");
            return res.status(400).json({success:false,msg:"Please login with correct credentials"});
        }

        //compare entered password with that found user hashed password
        const passwordCompare = await bcrypt.compare(req.body.password, user.password); //returns true or false
        if (!passwordCompare) {
            console.log("Please login with correct credentials");
            return res.status(400).json({success:false,msg:"Please login with correct credentials"});
        }

        // if loged in successfull send user except password
        const { password, ...others } = user._doc;
        res.status(200).json({success:true,user:others});

    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,error});
    }
});


// ********************* CRUD OPERATION ON USER TO CHANGE PROFILE SETTINGS******************

// update user
app.put('/api/users/update/:id', async (req, res) => {
    // check if right user trying to update only , userId provided by user
    if (req.body.userId === req.params.id) {
        if (req.body.password) {
            const salt = bcrypt.genSaltSync(10);
            // change password
            req.body.password = bcrypt.hashSync(req.body.password, salt);
        }
        try {
            // to update old posts username
            const user = await User.findById(req.params.id);

            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                {
                    // everything , username,email,password,profilePic
                    $set: req.body,
                },
                { new: true }
            );

            // also update usernamename of old saved posts of that user
            const response = await Post.updateMany({username:user.username} ,{username:updatedUser.username});
            
            res.status(200).json(updatedUser);
        } catch (err) {
            // username or email already taken
            res.status(500).json(err);
        }
    } else {
        res.status(401).json("You can update only your account!");
    }
});


// delete user
app.delete('/api/users/delete/:id', async (req, res) => {
    // check if right user trying to update only , userId provided by user
    if (req.body.userId === req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            try {
                //1st delete all posts of that user
                await Post.deleteMany({ username: user.username });
                // then User delete account
                await User.findByIdAndDelete(req.params.id);
                res.status(200).json({success:true,msg:"User has been deleted..."});
            } catch (err) {
                res.status(500).json({success:false,msg:err});
            }
        } catch (err) {
            console.log(err);
            res.status(404).json({success:false,msg:"User not found!"});
        }
    } else {
        res.status(401).json({success:false,msg:"You can delete only your account!"});
    }
});


//GET USER
app.get("/api/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const { password, ...others } = user._doc;
        res.status(200).json(others);
    } catch (err) {
        res.status(500).json(err);
    }
});


// ********************* CRUD OPERATION ON POST***********************

//CREATE POST
app.post("/api/posts/createpost", async (req, res) => {
    // title,desc,username is required
    const newPost = new Post(req.body);
    try {
        const savedPost = await newPost.save();
        res.status(200).json(savedPost);
    } catch (err) {
        res.status(500).json(err);
    }
});


//UPDATE POST
app.put("/api/posts/update/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        // only current user can change only his post , provide username
        if (post.username === req.body.username) {
            try {
                const updatedPost = await Post.findByIdAndUpdate(
                    req.params.id,
                    {
                        $set: req.body,
                    },
                    { new: true }
                );
                res.status(200).json(updatedPost);
            } catch (err) {
                res.status(500).json(err);
            }
        } else {
            res.status(401).json("You can update only your post!");
        }
    } catch (err) {
        res.status(500).json(err);
    }
});


//DELETE POST
app.delete("/api/posts/delete/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        // only current user can delete only his post , provide username
        if (post.username === req.body.username) {
            try {
                await post.delete();
                res.status(200).json("Post has been deleted...");
            } catch (err) {
                res.status(500).json(err);
            }
        } else {
            res.status(401).json("You can delete only your post!");
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

//GET SPECIFIC POST
app.get("/api/posts/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        res.status(200).json(post);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});



// QUERY -- 
// /api/posts/?user="john" means fetch all data of john

//GET ALL POSTS 
app.get("/api/posts", async (req, res) => {
    const username = req.query.user;
    const catName = req.query.cat;
    try {
        let posts;
        if (username) {
            posts = await Post.find({ username });
        } else if (catName) {
            posts = await Post.find({
                categories: {
                    $in: [catName],
                },
            });
            // if no query then fetch all posts
        } else {
            posts = await Post.find({});
        }
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json(err);
    }
});



// *********************** CATEGORY *********************

// create new category
app.post('/api/category', async (req, res) => {
    const name = req.body.name;
    const newCat = new Category({
        name: name
    });
    try {
        const savedCat = await newCat.save();
        res.status(200).json(savedCat);
    } catch (err) {
        res.status(500).json(err);
    }
});


// fetch all category
app.get("/api/category", async (req, res) => {
    try {
        const cats = await Category.find();
        res.status(200).json(cats);
    } catch (err) {
        res.status(500).json(err);
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
