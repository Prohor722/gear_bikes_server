const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  //   console.log("auth: ",authHeader);
  if (!authHeader) {
    res.status(401).send({ message: "Unauthorized Access." });
  }
  const token = authHeader.split(" ")[1];
  //   console.log(token);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access." });
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

async function run() {
  try {
    await client.connect();

    const productsCollection = client.db("gearBikes").collection("products");
    const usersCollection = client.db("gearBikes").collection("users");
    const reviewsCollection = client.db("gearBikes").collection("reviews");
    const orderCollection = client.db("gearBikes").collection("orders");

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAcc = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAcc.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "You do not have permission." });
      }
    };

    //payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

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
      const page = req.query.page;
      const skippedData = parseInt(page) * 12;
      let count;
      let products;
      if (search) {
        const query = { name: { $regex: new RegExp(search, "i") } };
        products = await productsCollection
          .find(query)
          .skip(skippedData)
          .limit(12)
          .toArray();
        count = await productsCollection.find(query).count();
      } else {
        products = await productsCollection
          .find()
          .skip(skippedData)
          .limit(12)
          .toArray();
        count = await productsCollection.estimatedDocumentCount();
      }
      res.send({ products, count });
    });

    //get single products
    app.get("/product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      products = await productsCollection.findOne(query);
      res.send(products);
    });

    //add product
    app.post("/addProduct", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const token = req.headers.authorization;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    //delete a product
    app.delete("/product/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
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
      const page = req.query.page;
      const skipData = parseInt(page) * 12;
      const reviews = await reviewsCollection
        .find()
        .skip(skipData)
        .limit(12)
        .toArray();
      res.send(reviews);
    });

    //reviews quantity
    app.get("/reviewCount", async (req, res) => {
      const count = await reviewsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    //get review user info api
    app.get("/reviewUserInfo/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send({ name: user?.name, img: user?.img });
    });

    //add user and send token
    app.put("/user", async (req, res) => {
      // console.log(req.body)
      const email = req.body.email;
      const name = req.body.name;
      const options = { upsert: true };
      const filter = { email };
      const userExists = await usersCollection.findOne(filter);
      if (userExists) {
        //   console.log(userExists)
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "3h",
        });
        res.send({ token });
      } else {
        const doc = {
          $set: {
            email,
            name,
            img: "https://i.ibb.co/Jc24hcy/f5qjkr3l.png",
          },
        };
        //   console.log(doc);
        const result = await usersCollection.updateOne(filter, doc, options);
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "3h",
        });
        res.send({ result, token });
      }
    });

    //get user data
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const token = req.headers.authorization;
      // console.log(token);
      const query = { email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //update user
    app.put("/updateUser", verifyJWT, async (req, res) => {
      const user = req.body;
      const id = user.id;
      const filter = { _id: ObjectId(id) };

      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //get all users for admin
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    //add order
    app.post("/addOrder", verifyJWT, async (req, res) => {
      const order = req.body;
      //   console.log(order);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //update order after payment
    app.patch("/order/paid", verifyJWT, async (req, res) => {
      const order = req.body;
      const query = { _id: ObjectId(order.id) };
      const updatedDoc = {
        $set: {
          status: "paid",
          transactionId: order.transactionId,
        },
      };

      const result = await orderCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    //update order status to shipped
    app.patch("/orderShipped/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const updateStatus = {
        $set: {
          status: "shipped",
        },
      };
      const result = await orderCollection.updateOne(filter, updateStatus);
      res.send(result);
    });

    //get orders for user
    app.get("/orders/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    //get single order details
    app.get("/getOrder/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    //delete order
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    //get all orders for admin
    app.get(
      "/orders/sortBy/:status",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const status = req.params.status;
        let query;
        //   console.log("status: ",status)
        if (status === "all") {
          query = {};
        } else {
          query = { status: status };
        }
        const orders = await orderCollection.find(query).toArray();
        res.send(orders);
      }
    );

    //add review
    app.post("/addReview", verifyJWT, async (req, res) => {
      const review = req.body;
      const userReview = {
        email: review.email,
        review: review.post,
        rate: review.rate,
      };
      const result = await reviewsCollection.insertOne(userReview);
      res.send(result);
    });

    //make admin api
    app.put("/makeAdmin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const doc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, doc);
      res.send(result);
    });

    //admin check for user
    app.get("/adminCheck/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      const isAdmin = user?.role === "admin";
      // console.log(isAdmin)
      res.send({ admin: isAdmin });
    });

    app.get("/test", (req, res) => {
      res.send("Testing route");
    });
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
