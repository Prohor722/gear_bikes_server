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

console.log(process.env.USER_NAME);

async function run(){
    try{
        await client.connect();

        const gearBikesCollection = client.db("gearBikes").collection("products");
        const usersCollection = client.db("gearBikes").collection("users");
        const reviewsCollection = client.db("gearBikes").collection("reviews");

        //get all products
        app.get('/products',(req,res)=>{
            const products = gearBikesCollection.find().toArray();
            res.send(products)
        })
    }
    finally{
    }
}

run().catch().dir

app.get('/',(req,res)=>{
    res.send("Welcome to GearBikes");
})

app.listen(port,()=>{
    console.log("Port"+port+" is running");
})