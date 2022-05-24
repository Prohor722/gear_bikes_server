const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app =express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req,res,next){
    const authHeader = req.headers.authorization;
    if(!authorization){
        res.status(401).send({message: "Unauthorized Access."})
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function( err, decoded){
        if(err){
            return status.status(403).send({message: "Forbidden Access."})
        }
        req.decoded = decoded;
        next();
    })

}

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.rk7zy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// console.log(process.env.USER_NAME);

async function run(){
    try{
        await client.connect();

        const productsCollection = client.db("gearBikes").collection("products");
        const usersCollection = client.db("gearBikes").collection("users");
        const reviewsCollection = client.db("gearBikes").collection("reviews");
        const orderCollection = client.db("gearBikes").collection("orders");

        //get latest home page products
        app.get('/latestProducts',async(req,res)=>{
            const products = await productsCollection.find().sort({_id:-1}).limit(6).toArray();
            res.send(products);
        })

        //get all products
        app.get('/products',async(req,res)=>{
            const search = req.query.search;
            // const query = {name:search};
            console.log(search);
            let products
            if(search){
                // const query={name:search};
                const query = { name: { $regex: search } };
                
                products = await productsCollection.find(query).toArray();
            }
            else{
                products = await productsCollection.find().toArray();
            }
            res.send(products);
        })

        //get single products
        app.get('/product/:id',async(req,res)=>{
            const id = req.params.id;
            console.log(id)
            const query = {_id:ObjectId(id)};
            products = await productsCollection.findOne(query);
            res.send(products);
        })

        //get latest home page reviews
        app.get('/latestReviews',async(req,res)=>{
            const reviews = await reviewsCollection.find().sort({_id:-1}).limit(6).toArray();
            res.send(reviews);
        })

        //get all reviews
        app.get('/reviews',async(req,res)=>{
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        })

        //add user and send token
        app.put('/user',async(req,res)=>{
            const email = req.body.email;
            const name = req.body.name;
            const options = { upsert: true };
            const filter = {email}
            const doc = {
                $set:{
                    email, name
                }
            }
            const result = await usersCollection.updateOne(filter, doc, options);
            const token = jwt.sign({email}, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "3h"
            });
            res.send({result,token});
        })

        //add order
        app.post('/addOrder', async(req,res)=>{
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

    }finally{
    }
}

run().catch(console.dir());

app.get('/',(req,res)=>{
    res.send("Welcome to GearBikes");
})

app.listen(port,()=>{
    console.log("Port: "+port+" is running");
})