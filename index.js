const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app =express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.rk7zy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// console.log(process.env.USER_NAME);

async function run(){
    try{
        await client.connect();

        const productsCollection = client.db("gearBikes").collection("products");
        const usersCollection = client.db("gearBikes").collection("users");
        const reviewsCollection = client.db("gearBikes").collection("reviews");

        //get latest home page products
        app.get('/latestProducts',async(req,res)=>{
            const products = await productsCollection.find().sort({_id:-1}).limit(6).toArray();
            res.send(products);
        })

        //get all products
        app.get('/products',async(req,res)=>{
            const products = await productsCollection.find().toArray();
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



        //add user
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