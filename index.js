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
        const searchQuery = search
          ? { name: { $regex: search, $options: "i" } }
          : {};

        const brand = req?.query?.brand;
        const brandQuery = brand ? { brand } : {};

        const category = req?.query?.category;
        const categoryQuery = category ? { category } : {};

        // price query:
        const minPrice = Number(req?.query?.minPrice);
        const maxPrice = Number(req?.query?.maxPrice);
        const priceQuery = {};
        if (minPrice && maxPrice) {
          priceQuery.price = { $gte: minPrice, $lte: maxPrice };
        } else if (minPrice && !maxPrice) {
          priceQuery.price = { $gte: minPrice };
        } else if (maxPrice && !minPrice) {
          priceQuery.price = { $lte: maxPrice };
        }

        // sorting:
        const sortOrder = req.query?.sortOrder;
        let sortQuery = {};
        if (sortOrder === "low-to-high") {
          sortQuery = { price: 1 }; // Ascending order
        } else if (sortOrder === "high-to-low") {
          sortQuery = { price: -1 }; // Descending order
        }

        let products = [];
        if (
          brandQuery.brand ||
          categoryQuery.category ||
          minPrice ||
          maxPrice
        ) {
          products = await productsCollection
            .find({
              ...searchQuery,
              ...brandQuery,
              ...categoryQuery,
              ...priceQuery,
            })
            .sort(sortQuery)
            .toArray();
          return res.send(products);
        }

        products = await productsCollection
          .find({
            ...searchQuery,
          })
          .skip(currentPage * perPageView)
          .limit(perPageView)
          .sort(sortQuery)
          .toArray();
        res.send(products);
      } catch (error) {
        res.send({ message: error });
      }
    });

    // get all brands:
    app.get("/product-brand-names", async (req, res) => {
      const options = { projection: { _id: 0, brand: 1 } };
      const names = await productsCollection.find({}, options).toArray();
      let brands = [];

      for (let name of names) {
        if (!brands.includes(name.brand)) {
          brands.push(name.brand);
        }
      }
      return res.send(brands);
    });

    // get all categories:
    app.get("/product-category-names", async (req, res) => {
      const options = { projection: { _id: 0, category: 1 } };
      const names = await productsCollection.find({}, options).toArray();
      let categories = [];

      for (let name of names) {
        if (!categories.includes(name.category)) {
          categories.push(name.category);
        }
      }
      return res.send(categories);
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
