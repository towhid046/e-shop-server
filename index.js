const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT | 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q1nysvk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("E-shop server is running...");
});

async function run() {
  const productsCollection = client.db("eShopDB").collection("products");
  try {
    // get estimated document count:
    app.get("/products-count", async (req, res) => {
      const productCount = await productsCollection.estimatedDocumentCount();
      res.send({ productCount });
    });
    // get all products:
    app.get("/products", async (req, res) => {
      try {
        const perPageView = Number(req.query?.perPageView);
        const currentPage = Number(req.query?.currentPage) - 1;
        const search = req.query?.search?.trim();
        const query = search ? { name: { $regex: search, $options: "i" } } : {};
        const products = await productsCollection
          .find(query)
          .skip(currentPage * perPageView)
          .limit(perPageView)
          .toArray();
        res.send(products);
      } catch (error) {
        res.send({ message: error });
      }
    });

    //get a single product by id:
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      if (!id) {
        return req.send({ message: "Id is required" });
      }
      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(product);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`E-shop server is running on port: ${port}`);
});
