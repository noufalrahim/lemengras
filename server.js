require("dotenv").config({ path: "./.env" })
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const cors = require("cors")
const mongoose = require("mongoose")
const app = express();
const port = process.env.PORT || 8000
const jsdom = require('jsdom')
const dom = new jsdom.JSDOM("")
const jquery = require('jquery')(dom.window)
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const findOrCreate = require('mongoose-find-or-create')
const crypto = require("crypto");
const Razorpay = require("razorpay")
var LocalStrategy = require('passport-local');

var LocalStrategy = require('passport-local');

app.use(require("body-parser").json());
var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret,
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));
app.use(session({
    resave: false,
    secret: "topsecret",
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())


const productDetails = []

const idArray = ['641ac7e7b16d9d54abc703bf']
const userEmail = []


main().catch(err => console.log(err));
async function main() {


    await mongoose.connect(process.env.mongodb);
    console.log("Connected to Database");




    const productDetailsSchema = new mongoose.Schema({
        product_id: String,
        heading: String,
        content: String,
        price: Number,
        StyleCode: String,
    })

    const detailSchema = new mongoose.Schema({
        email: String,
        address1: String,
        address2: String,
        city: String,
        state: String,
        pincode: Number,
        phoneNo: Number 
    })

    const userSchema = new mongoose.Schema({
        email: String,
        password: String,
        googleId: String,
        //cart schema
    })

    const cartSchema = new mongoose.Schema({
        itemId: String,
        username: String,
        image1: String,
        heading: String,
        content: String,
        price: Number
    })

    const itemSchema = new mongoose.Schema({
        category: String,
        image1: String,
        image2: String,
        heading: String,
        content: String,
        price: Number,
        StyleCode: String,
        Fit: String,
        Brand: String,
        Color: String,
        Material: String,
        description: String
    })

    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate)

    const User = new mongoose.model("User", userSchema)
    const Cart = new mongoose.model("Cart", cartSchema)
    const Item = mongoose.model("Item", itemSchema);
    const Details = mongoose.model("Details", detailSchema)
    const orderedProduct = mongoose.model("orderedProduct", productDetailsSchema)

    app.get("/", function (req, res) {
        res.render("homePage")
    })
    
    app.get("/review", function(req,res){
        res.render("review")
    })

    passport.use(User.createStrategy())
    passport.serializeUser(User.serializeUser())
    passport.deserializeUser(User.deserializeUser())

    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/homePage",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
        function (accessToken, refreshToken, profile, cb) {
            console.log(profile)
            User.findOrCreate({ googleId: profile.id }, function (err, user) {
                return cb(err, user);
            })
        }))

    app.get('/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/auth/google/secrets',
        passport.authenticate('google', { failureRedirect: '/login' }),
        function (req, res) {
            // Successful authentication, redirect home.
            res.redirect('/secrets');
        });
    app.get("/logout", function (req, res) {
        req.logOut(function (err) {
            if (err) {
                console.log(err)
            }
        });
        res.redirect("/")
    })


    
    app.post("/register", function (req, res) {
        User.register({ username: req.body.username }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");

            }
            else {
                userEmail.push(req.body.username)
                passport.authenticate("local")(req, res, function () {
                    
                })
            }
        })
    })

    app.post("/login",function(req,res){
        const user = new User({
            username: req.body.username,
            password: req.body.password
            
        })
        req.logIn(user, function(err){
            if(err){
                console.log(err);

            }else{
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets")
                    userEmail.push(req.body.username)
                    console.log(userEmail)
                })
            }
        })
    })




    app.get("/secrets",function(req,res){
        if(req.isAuthenticated()){
            res.render("secrets")
        }else{
            res.redirect("/login")
        }
    })

    

    


    


    app.get("/compose", function (req, res) {
        res.render("compose")
    })
    
    app.post("/create/orderId", (req, res) => {
        console.log("create orderId request", req.body);
        var options = {
            amount: "10000",  // amount in the smallest currency unit
            currency: "INR",
            receipt: "rcp1"
        };
        instance.orders.create(options, function (err, order) {
            console.log(order);
            res.send({ orderId: order.id })
        });

    })

    app.get("/adminDashboard",function(req,res){
        res.render("admin")
    })

    app.get("/login",function(req,res){
        res.render("login")
    })

    app.get("/register",function(req,res){
        res.render("register")
    })



    app.post("/api/payment/verify", (req, res) => {

        let body = req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;
        var expectedSignature = crypto.createHmac('sha256', 'rzp_test_8ZDwkElu5zWD8p')
            .update(body.toString())
            .digest('hex');
        console.log("sig received ", req.body.response.razorpay_signature);
        console.log("sig generated ", expectedSignature);
        var response = { "signatureIsValid": "false",
                          "status": "Paid"}
        if (expectedSignature === req.body.response.razorpay_signature)
            {
                response = { "signatureIsValid": "true",
                "status": "Paid" }
            }
            
        

        const newOrderedProduct = new orderedProduct({
            product_id: productDetails[productDetails.length-5],
            heading: productDetails[productDetails.length-4],
            content: productDetails[productDetails.length-3],
            price: productDetails[productDetails.length-2],
            StyleCode: productDetails[productDetails.length-1],
        })
        newOrderedProduct.save()
       
        res.send(response);

        
        
    });


    var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

    var options = {
        amount: 100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: "order_rcptid_11"
    };
    instance.orders.create(options, function (err, order) {
        console.log(order);

    });


    app.get("/orderPlaced", function(req,res){
        res.render("orderPlaced")
    })

    
    

    app.post("/compose", function (req, res) {
        if (req.body.item === "shirt") {
            const newShirt = new Item({
                category: "shirt",
                image1: req.body.Image1,
                image2: req.body.Image2,
                heading: req.body.heading,
                content: req.body.Content,
                price: req.body.Price,
                StyleCode: req.body.StyleCode,
                Fit: req.body.Fit,
                Brand: req.body.Brand,
                Color: req.body.Color,
                Material: req.body.Material,
                description: req.body.description
            })
            newShirt.save()
            res.redirect("/compose")
        }
        else if (req.body.item === "pants") {
            const newPant = new Item({
                category: "pant",
                image1: req.body.Image1,
                image2: req.body.Image2,
                heading: req.body.heading,
                content: req.body.Content,
                price: req.body.Price,
                StyleCode: req.body.StyleCode,
                Fit: req.body.Fit,
                Brand: req.body.Brand,
                Color: req.body.Color,
                Material: req.body.Material,
                description: req.body.description
            })
            newPant.save()
            res.redirect("/compose")
        }
        else if (req.body.item === "jeans") {
            const newJeans = new Item({
                category: "jeans",
                image1: req.body.Image1,
                image2: req.body.Image2,
                heading: req.body.heading,
                content: req.body.Content,
                price: req.body.Price,
                StyleCode: req.body.StyleCode,
                Fit: req.body.Fit,
                Brand: req.body.Brand,
                Color: req.body.Color,
                Material: req.body.Material,
                description: req.body.description
            })
            newJeans.save()
            res.redirect("/compose")
        }
        else if (req.body.item === "tshirt") {
            const newTshirt = new Item({
                category: "tshirt",
                image1: req.body.Image1,
                image2: req.body.Image2,
                heading: req.body.heading,
                content: req.body.Content,
                price: req.body.Price,
                StyleCode: req.body.StyleCode,
                Fit: req.body.Fit,
                Brand: req.body.Brand,
                Color: req.body.Color,
                Material: req.body.Material,
                description: req.body.description
            })
            newTshirt.save()
            res.redirect("/compose")
        }
    }

    )

    app.get("/homePage",function(req,res){
        res.render("homePage")
    })
    ////from here
    app.get("/shirtPage", async function (req, res) {
        const shirtSubArray = []
        var foundShirts = await Item.find()
        for (var i=0;i<foundShirts.length;i++){
            if(foundShirts[i].category === "shirt"){
                shirtSubArray.push(foundShirts[i])
            }
        }
        res.render("shirtPage", {
            newItemArray: shirtSubArray
        })


    })
    app.get("/pantsPage", async function (req, res) {
        const pantSubArray = []
        var foundPants = await Item.find()
        for (var i=0;i<foundPants.length;i++){
            if(foundPants[i].category === "pant"){
                pantSubArray.push(foundPants[i])
            }
        }
        res.render("pantsPage", {
            newItemArray: pantSubArray
        })
    })
    app.get("/tshirtPage", async function (req, res) {
        const tshirtSubArray = []
        var foundTshirts = await Item.find()
        for (var i=0;i<foundTshirts.length;i++){
            if(foundTshirts[i].category === "tshirt"){
                tshirtSubArray.push(foundTshirts[i])
            }
        }
        res.render("tshirtPage", {
            newItemArray: tshirtSubArray
        })
    })
    app.get("/jeansPage", async function (req, res) {
        const jeansSubArray = []
        var foundJeans = await Item.find()
        for (var i=0;i<foundJeans.length;i++){
            if(foundJeans[i].category === "jeans"){
                jeansSubArray.push(foundJeans[i])
            }
        }
        res.render("jeansPage", {
            newItemArray: jeansSubArray
        })
    })
//  initiate emailsending very important
    app.post("/checkout", async function(req,res){
        const newDetails = new Details({
            email: userEmail[userEmail.length-1],
            address1: req.body.HouseNo,
            address2: req.body.Landmark,
            city: req.body.City,
            state: req.body.State,
            pincode: req.body.Pincode,
            phoneNo: req.body.PhoneNo
        })
        newDetails.save()
        const detailsArray = await Item.findById(idArray[idArray.length-1])
        options= {
            price: detailsArray.price,
            status: "disabled",
            collapsed: "",
            collapsed1: "collapse",
            show: "show",
            show1: ""  

        }
            res.render("checkout",options)

    })
    app.get("/loading",function(req,res){
        res.render("loading")
    })
    app.post("/buynow",async function(req,res){
        if(idArray != 0){
            if(req.body.gotocheckout === "gotocheckout"){
                const detailsArray = await Item.findById(idArray[idArray.length-1])
                console.log(detailsArray)
                options= {
                    price: detailsArray.price,
                    status: "enabled",
                    collapsed: "collapsed",
                    collapsed1: "",
                    show: "",
                    show1: "show"                          
                }
                    res.render("checkout",options)
                }
        }
        
    })

    app.post("/shirtPage", async function (req, res) {
        if (req.body.hasOwnProperty("id1")) {
            const newID = req.body.id1
            idArray.push(newID)
            const shirtItem = await Item.findById(idArray[idArray.length - 1])
            productDetails.push(newID)
            productDetails.push(shirtItem.heading)
            productDetails.push(shirtItem.content)
            productDetails.push(shirtItem.price)
            productDetails.push(shirtItem.StyleCode)
            console.log(productDetails)
           
            const shirtSubArray = []
            const shirtArray = await Item.find()
            for (var i = 0; i < shirtArray.length; i++) {
                if (shirtArray[i].category === "shirt") {
                    shirtSubArray.push(shirtArray[i])
                }
            }
            
            var options = {
                image1: shirtItem.image1,
                image2: shirtItem.image2,
                heading: shirtItem.heading,
                content: shirtItem.content,
                price: shirtItem.price,
                StyleCode: shirtItem.StyleCode,
                Fit: shirtItem.Fit,
                Brand: shirtItem.Brand,
                Pattern: shirtArray.Pattern,
                Color: shirtItem.Color,
                Material: shirtItem.Material,
                description: shirtItem.description,
                newItemArray: shirtSubArray
            }
            res.render("buynow", options)
        }
        else if (req.body.hasOwnProperty("id2")) {
            if (req.isAuthenticated) {
                const newID = req.body.id2
                const shirtItem = await Item.findById(newID)
                const newCartItem = new Cart({
                    itemId: newID,
                    username: req.body.username,
                    image1: shirtItem.image1,
                    heading: shirtItem.heading,
                    content: shirtItem.content,
                    price: shirtItem.price
                })
                newCartItem.save()
                setTimeout(async function () {
                    const cartItem = await Cart.find()
                    var options = {
                        newCartArray: cartItem
                    }
                    res.render("addtocart", options)
                }, 1000);
                
            }

        }
    }
    )

    app.post("/pantsPage", async function (req, res) {
        if (req.body.hasOwnProperty("id1")) {
            const newID = req.body.id1
            idArray.push(newID)
            const pantItem = await Item.findById(idArray[idArray.length - 1])
            productDetails.push(newID)
            productDetails.push(pantItem.heading)
            productDetails.push(pantItem.content)
            productDetails.push(pantItem.price)
            productDetails.push(pantItem.StyleCode)
            console.log(productDetails)
           
            const pantSubArray = []
            var foundPants = await Item.find()
            for (var i = 0; i < foundPants.length; i++) {
                if (foundPants[i].category === "pant") {
                    pantSubArray.push(foundPants[i])
                }
            }
            // integrate email
            
            var options = {
                image1: pantItem.image1,
                image2: pantItem.image2,
                heading: pantItem.heading,
                content: pantItem.content,
                price: pantItem.price,
                StyleCode: pantItem.StyleCode,
                Fit: pantItem.Fit,
                Brand: pantItem.Brand,
                Pattern: pantItem.Pattern,
                Color: pantItem.Color,
                Material: pantItem.Material,
                description: pantItem.description,
                newItemArray: pantSubArray
            }
            res.render("buynow", options)
        }
        else if (req.body.hasOwnProperty("id2")) {
            if (req.isAuthenticated) {
                const newID = req.body.id2
                console.log(newID)
                const newItem = await Item.findById(newID)
                const newCartItem = new Cart({
                    itemId: newID,
                    username: req.body.username,
                    image1: newItem.image1,
                    heading: newItem.heading,
                    content: newItem.content,
                    price: newItem.price
                })
                newCartItem.save()
                setTimeout(async function () {
                    const cartItem = await Cart.find()
                    var options = {
                        newCartArray: cartItem
                    }
                    console.log(cartItem)
                    res.render("addtocart", options)
                }, 1000);
            }

        }
    }
    )

    app.post("/jeansPage", async function (req, res) {
        if (req.body.hasOwnProperty("id1")) {
            const newID = req.body.id1
            idArray.push(newID)
            const jeansItem = await Item.findById(idArray[idArray.length - 1])
            productDetails.push(newID)
            productDetails.push(jeansItem.heading)
            productDetails.push(jeansItem.content)
            productDetails.push(jeansItem.price)
            productDetails.push(jeansItem.StyleCode)
            console.log(productDetails)
           
            const jeansSubArray = []
            var foundJeans = await Item.find()
            for (var i = 0; i < foundJeans.length; i++) {
                if (foundJeans[i].category === "jeans") {
                    jeansSubArray.push(foundJeans[i])
                }
            }
            
            var options = {
                image1: jeansItem.image1,
                image2: jeansItem.image2,
                heading: jeansItem.heading,
                content: jeansItem.content,
                price: jeansItem.price,
                StyleCode: jeansItem.StyleCode,
                Fit: jeansItem.Fit,
                Brand: jeansItem.Brand,
                Pattern: jeansItem.Pattern,
                Color: jeansItem.Color,
                Material: jeansItem.Material,
                description: jeansItem.description,
                newItemArray: jeansSubArray
            }
            res.render("buynow", options)
        }
        else if (req.body.hasOwnProperty("id2")) {
            if (req.isAuthenticated) {
                const newID = req.body.id2
                const shirtItem = await Item.findById(newID)
                const newCartItem = new Cart({
                    itemId: newID,
                    username: req.body.username,
                    image1: shirtItem.image1,
                    heading: shirtItem.heading,
                    content: shirtItem.content,
                    price: shirtItem.price
                })
                newCartItem.save()
                setTimeout(async function () {
                    const cartItem = await Cart.find()
                    var options = {
                        newCartArray: cartItem
                    }
                    console.log(cartItem)
                    res.render("addtocart", options)
                }, 1000);
            }

        }
    }
    )
    app.post("/tshirtPage", async function (req, res) {
        if (req.body.hasOwnProperty("id1")) {
            const newID = req.body.id1
            idArray.push(newID)
            const tshirtItem = await Item.findById(idArray[idArray.length - 1])
            productDetails.push(newID)
            productDetails.push(tshirtItem.heading)
            productDetails.push(tshirtItem.content)
            productDetails.push(tshirtItem.price)
            productDetails.push(tshirtItem.StyleCode)
            console.log(productDetails)
            const tshirtSubArray = []
            var foundTshirts = await Item.find()
            for (var i=0;i<foundTshirts.length;i++){
                if(foundTshirts[i].category === "tshirt"){
                    tshirtSubArray.push(foundTshirts[i])
                }
            }
            var options = {
                image1: tshirtItem.image1,
                image2: tshirtItem.image2,
                heading: tshirtItem.heading,
                content: tshirtItem.content,
                price: tshirtItem.price,
                StyleCode: tshirtItem.StyleCode,
                Fit: tshirtItem.Fit,
                Brand: tshirtItem.Brand,
                Pattern: tshirtItem.Pattern,
                Color: tshirtItem.Color,
                Material: tshirtItem.Material,
                description: tshirtItem.description,
                newItemArray: tshirtSubArray
            }
            res.render("buynow", options)
        }
        else if (req.body.hasOwnProperty("id2")) {
            if (req.isAuthenticated) {
                const newID = req.body.id2
                const shirtItem = await Item.findById(newID)
                const newCartItem = new Cart({
                    itemId: newID,
                    username: req.body.username,
                    image1: shirtItem.image1,
                    heading: shirtItem.heading,
                    content: shirtItem.content,
                    price: shirtItem.price
                })
                setTimeout(async function () {
                    const cartItem = await Cart.find()
                    var options = {
                     }
                    res.render("addtocart", options)
                    console.log(cartItem)
                }, 1000);
            }
            // 

            // 
            

        }
    }
    )





    app.get("/*", function (req, res) {
        res.render("pagenotfound")
    })

    

    app.listen(port, async function () {
        console.log("Server is running on port :" + port);


    })
}