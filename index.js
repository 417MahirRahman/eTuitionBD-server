const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8rpbzhd.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//Verify JWT Token
const verifyJWTToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log("Auth: ", authorization);
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //dataBase, Collection
    const dataBase = client.db("eTuitionBD");
    const userCollection = dataBase.collection("Users");
    const tuitionPostCollection = dataBase.collection("Tuition_Post");
    const tutorApplicationCollection = dataBase.collection(
      "Tutor_Application_Post"
    );

    //JWT API's
    app.post("/getToken", (req, res) => {
      const user = req.body;

      if (!user || !user.email) {
        return res.status(400).send({ message: "Invalid user data" });
      }
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token: token });
    });

    //Add Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;
      const exsistUser = await userCollection.findOne({ email });

      if (exsistUser) {
        return res.send({ message: "User already exsist" });
      }

      const result = await userCollection.insertOne(user);

      res.send({
        success: true,
        result,
      });
    });

    //Get user role
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;

      const user = await userCollection.findOne({
        email: { $regex: `^${email}$`, $options: "i" },
      });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ role: user.role });
    });

    //Get all tuitions
    app.get("/allTuitions", async (req, res) => {
      const result = await tuitionPostCollection.find().toArray();

      res.send(result);
    });

    //Get a specific tuition by ID
    app.get("/allTuitions/:id", async (req, res) => {
      const { id } = req.params;
      const result = await tuitionPostCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send({
        success: true,
        result,
      });
    });

    //-----Student Functionalities-----//
    //Get My Tuitions
    app.get("/allTuitions/:Email", async (req, res) => {
      const email = req.params.Email;
      //console.log("email", email);
      const result = await tuitionPostCollection
        .find({ Email: email })
        .toArray();

      if (result.length === 0) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });

    //Post New Tuition
    app.post("/tuitionPost", verifyJWTToken, async (req, res) => {
      const data = req.body;
      const result = await tuitionPostCollection.insertOne(data);

      res.send({
        success: true,
        result,
      });
    });

    // Update My-Tuitions Info by ID
    app.put("/tuitionPost/:id", async (req, res) => {
      const id = req.params.id;

      const updatedData = JSON.parse(
        JSON.stringify({
          Class: req.body.Class,
          Subjects: req.body.Subjects,
          Budget: req.body.Budget,
          Location: req.body.Location,
        })
      );

      const result = await tuitionPostCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedData },
        { returnDocument: "after" }
      );

      return res.send({
        success: true,
        message: "Tuition info updated successfully",
        updatedInfo: result.value,
      });
    });

    //Delete Tuition Post
    app.delete("/tuitionPost/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);

      const result = await tuitionPostCollection.deleteOne({ _id: objectId });

      res.send({
        success: true,
        result,
      });
    });

    //Get Tutor's Application for my Tuition Post
    app.get("/tuitionApplication/:Email", async (req, res) => {
      const email = req.params.Email;
      console.log("email", email);
      const result = await tutorApplicationCollection
        .find({ studentEmail: email })
        .toArray();

      if (result.length === 0) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });

    //Reject a Tutor API
    app.put("/statusUpdate/:id", async (req, res) => {
      const id = req.params.id;

      const result = await tutorApplicationCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: req.body },
        { returnDocument: "after" }
      );

      return res.send({
        success: true,
        message: "Status updated successfully",
        updatedInfo: result.value,
      });
    });

    //-----Tutor Functionalities-----//
    //Get My Tuitions ok
    app.get("/tutorApplication/:Email", verifyJWTToken, async (req, res) => {
      const email = req.params.Email;
      console.log("email", email);
      const result = await tutorApplicationCollection
        .find({ Email: email })
        .toArray();

      if (result.length === 0) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });

    //Apply for tuition ok
    app.post("/tutorApplication", verifyJWTToken, async (req, res) => {
      const data = req.body;
      const result = await tutorApplicationCollection.insertOne(data);

      res.send({
        success: true,
        result,
      });
    });

    // Update My-Application Info by ID
    app.put("/tutorApplication/:id", async (req, res) => {
      const id = req.params.id;

      const updatedData = JSON.parse(
        JSON.stringify({
          Qualification: req.body.Qualification,
          Experience: req.body.Experience,
          Expected_Salary: req.body.Expected_Salary,
        })
      );

      const result = await tutorApplicationCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedData },
        { returnDocument: "after" }
      );

      return res.send({
        success: true,
        message: "Your Application info updated successfully",
        updatedInfo: result.value,
      });
    });

    //Delete My Application
    app.delete("/tutorApplication/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);

      const result = await tutorApplicationCollection.deleteOne({
        _id: objectId,
      });

      res.send({
        success: true,
        result,
      });
    });

    app.put("/demo/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = new ObjectId(id);

      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await collection.updateOne({ filter, update });

      res.send({
        success: true,
        result,
      });
    });

    app.delete("/demo/id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };

      const result = await collection.deleteOne({ filter });

      req.send({
        success: true,
        result,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`The Server is Running on port ${port}`);
});
