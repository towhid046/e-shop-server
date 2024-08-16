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
      try {
        const productCount = await productsCollection.estimatedDocumentCount();
        res.send({ productCount });
      } catch (error) {
        res.send({ error });
      }
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

        // Sorting by price
        const sortOrderPrice = req.query?.sortOrderPrice;
        let sortQuery = {};
        if (sortOrderPrice === "low-to-high") {
          sortQuery.price = 1;
        } else if (sortOrderPrice === "high-to-low") {
          sortQuery.price = -1;
        }

        // Sorting by date
        const sortOrderDate = req.query?.sortOrderDate;
        if (sortOrderDate === "newest-first") {
          sortQuery.created_at = -1;
        } else if (sortOrderDate === "oldest-first") {
          sortQuery.created_at = 1;
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
        res.send({ error });
      }
    });

    // get all brands:
    app.get("/product-brand-names", async (req, res) => {
      try {
        const options = { projection: { _id: 0, brand: 1 } };
        const names = await productsCollection.find({}, options).toArray();
        let brands = [];

        for (let name of names) {
          if (!brands.includes(name.brand)) {
            brands.push(name.brand);
          }
        }
        return res.send(brands);
      } catch (error) {
        res.send({ error });
      }
    });

    // get all categories:
    app.get("/product-category-names", async (req, res) => {
      try {
        const options = { projection: { _id: 0, category: 1 } };
        const names = await productsCollection.find({}, options).toArray();
        let categories = [];

        for (let name of names) {
          if (!categories.includes(name.category)) {
            categories.push(name.category);
          }
        }
        return res.send(categories);
      } catch (error) {
        res.send({ error });
      }
    });

    //get a single product by id:
    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!id) {
          return req.send({ message: "Id is required" });
        }
        const product = await productsCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(product);
      } catch (error) {
        res.send({ error });
      }
    });

    // get cart products:
    app.post("/cart-items", async (req, res) => {
      try {
        const productIds = req.body;
        const objectIds = productIds?.map((id) => new ObjectId(id));
        const query = { _id: { $in: objectIds } };
        const products = await productsCollection.find(query).toArray();
        res.send(products);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while fetching cart items");
      }
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
