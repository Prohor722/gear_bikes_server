const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authorization) {
    res.status(401).send({ message: "Unauthorized Access." });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return status.status(403).send({ message: "Forbidden Access." });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.rk7zy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// console.log(process.env.USER_NAME);

async function run() {
  try {
    await client.connect();

    const productsCollection = client.db("gearBikes").collection("products");
    const usersCollection = client.db("gearBikes").collection("users");
    const reviewsCollection = client.db("gearBikes").collection("reviews");
    const orderCollection = client.db("gearBikes").collection("orders");

    //get latest home page products
    app.get("/latestProducts", async (req, res) => {
      const products = await productsCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(products);
    });

    //get all products
    app.get("/products", async (req, res) => {
      const search = req.query.search;
      // const query = {name:search};
    //   console.log(search);
      let products;
      if (search) {
        // const query={name:search};
        const query = { name: { $regex: search } };

        products = await productsCollection.find(query).toArray();
      } else {
        products = await productsCollection.find().toArray();
      }
      res.send(products);
    });

    //get single products
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
    //   console.log(id);
      const query = { _id: ObjectId(id) };
      products = await productsCollection.findOne(query);
      res.send(products);
    });

    //get latest home page reviews
    app.get("/latestReviews", async (req, res) => {
      const reviews = await reviewsCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(reviews);
    });

    //get all reviews
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });

    //add user and send token
    app.put("/user", async (req, res) => {
        console.log(req.body)
      const email = req.body.email;
      const name = req.body.name;
      const options = { upsert: true };
      const filter = { email };
      const userExists = await usersCollection.findOne(filter);
      if(userExists){
          console.log(userExists)
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "3h",
          });
          res.send({ token });
      }
      else{
          const doc = {
            $set: {
              email,
              name,
              img: 'https://i.ibb.co/Jc24hcy/f5qjkr3l.png',
            },
          };
          console.log(doc);
          const result = await usersCollection.updateOne(filter, doc, options);
          const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "3h",
          });
          res.send({ result, token });
      }

    });

    //get user data
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const token = req.headers.authorization;
      // console.log(token);
      const query = { email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //update user
    app.put("/updateUser", async (req, res) => {
      const user = req.body;
      const id = user.id;
      const filter = { _id: ObjectId(id) };

      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };

      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    //get all users for admin
    app.get("/users", async(req, res) => {
        const users = await usersCollection.find().toArray();
        res.send(users);
      });

    //add order
    app.post("/addOrder", async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //get orders for user
    app.get("/orders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    //get all orders for admin
    app.get("/orders", async(req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });

    //add review
    app.post("/addReview", async (req, res) => {
      const review = req.body;
      const token = req.headers.authorization;
    //   console.log(token);
      const user = await usersCollection.findOne({ email: review.email });

      const userReview = {
        name: review.name,
        email: review.email,
        img: user.img,
        review: review.post,
        rate: review.rate,
      };
      const result = await reviewsCollection.insertOne(userReview);
      res.send(result);
    });

    //make admin api
    app.put('/makeAdmin/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const doc = {
            $set:{
                role: 'admin'
            }
        }
        const result = await usersCollection.updateOne(query, doc);
        res.send(result);
    })
  } finally {
  }
}

run().catch(console.dir());

app.get("/", (req, res) => {
  res.send("Welcome to GearBikes");
});

app.listen(port, () => {
  console.log("Port: " + port + " is running");
});
