const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = 3000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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
    const paymentHistory = dataBase.collection("Payment_History");

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
        email: email.toLowerCase() || email.toUpperCase(),
      });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ role: user.role });
    });

    //Get User's Info by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      console.log("email", email);
      const result = await userCollection.findOne({
        email: email.toLowerCase() || email.toUpperCase(),
      });
      if (!result) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });

    //Update User's Info (for-Users) working
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;

      const updatedData = JSON.parse(
        JSON.stringify({
          name: req.body.name,
          Image_URL: req.body.Image_URL,
          phoneNumber: req.body.phoneNumber,
        })
      );

      const result = await userCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedData },
        { returnDocument: "after" }
      );

      return res.send({
        success: true,
        message: "Profile updated successfully",
        updatedInfo: result.value,
      });
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

    //-----Admin Functionalities Start-----//
    //Get all User's info
    app.get("/allUsers", async (req, res) => {
      const result = await userCollection.find().toArray();

      res.send(result);
    });

    //Get all Tuition-Post info
    app.get("/allTuitionPost", async (req, res) => {
      const result = await tuitionPostCollection.find().toArray();

      res.send(result);
    });

    //Update Tuition Post Status
    app.put("/postStatusUpdate/:id", async (req, res) => {
      const id = req.params.id;

      const result = await tuitionPostCollection.findOneAndUpdate(
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

    //Update User's Info (for-Admin)
    app.put("/updateUsers/:id", async (req, res) => {
      const id = req.params.id;

      const updatedData = {
        name: req.body.name,
        role: req.body.role,
        Image_URL: req.body.Image_URL,
        phoneNumber: req.body.phoneNumber,
      };

      console.log(updatedData);

      const result = await userCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedData },
        { returnDocument: "after" }
      );

      console.log("result:", result)

      return res.send({
        success: true,
        message: "Profile updated successfully",
        updatedInfo: result,
      });
    });

    //Delete User from the Database
    app.delete("/allUsers/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);

      const result = await userCollection.deleteOne({ _id: objectId });

      res.send({
        success: true,
        result,
      });
    });

    //-----Student Functionalities Start-----//
    //Get My Tuitions
    app.get("/tuitions/:email", async (req, res) => {
      const email = req.params.email;
      console.log("email", email);
      const result = await tuitionPostCollection
        .find({ Email: email.toLowerCase() || email.toUpperCase() })
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

    // Update My-Tuitions Info by ID problem
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
    app.get("/tuitionApplication/:email", async (req, res) => {
      const email = req.params.email;
      console.log("email", email);
      const result = await tutorApplicationCollection
        .find({ studentEmail: email.toLowerCase() || email.toUpperCase() })
        .toArray();

      if (result.length === 0) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });

    //Payment API
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      console.log(paymentInfo);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "USD",
              product_data: {
                name: "Tuition-Fee",
              },
              unit_amount: paymentInfo?.tutorSalary * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: paymentInfo?.studentEmail,
        metadata: {
          studentEmail: paymentInfo?.studentEmail,
          studentID: paymentInfo?.studentID,
          tutorID: paymentInfo?.tutorID,
          tutorEmail: paymentInfo?.tutorEmail,
        },
        success_url: `${process.env.CLIENT_SITE}/dashboard/paymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_SITE}/dashboard/appliedTutors`,
      });
      res.send({ url: session.url });
    });

    app.put("/paymentSuccess", async (req, res) => {
      const sessionID = req.query.session_id;
      const Session = await stripe.checkout.sessions.retrieve(sessionID);

      const transactionID = Session.payment_intent;
      const filter = { transactionID: transactionID };

      const transactionIDExist = await paymentHistory.findOne(filter);

      if (transactionIDExist) {
        return res.send({
          message: "Payment history already exist.",
          transactionID,
        });
      }

      if (Session.payment_status === "paid") {
        const id = Session.metadata.tutorID;
        const filter = { _id: new ObjectId(id) };
        const updateStatus = {
          $set: {
            Status: "Approved",
          },
        };
        const result = await tutorApplicationCollection.updateOne(
          filter,
          updateStatus
        );
        res.send(result);
      }

      const paymentInfo = {
        Amount: Session.amount_total / 100,
        transactionID: transactionID,
        paymentStatus: Session.payment_status,
        studentID: Session.metadata.studentID,
        studentEmail: Session.metadata.studentEmail,
        tutorID: Session.metadata.tutorID,
        tutorEmail: Session.metadata.tutorEmail,
        paidTime: new Date(),
      };

      if (Session.payment_status === "paid") {
        const payResult = await paymentHistory.insertOne(paymentInfo);
        res.send({ success: true, payResult });
      }

      res.send({ message: "Status update failed" });
    });

    //Reject a Tutor API working
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

    //Student Payment History API
    app.get("/studentPayment/:email", async (req, res) => {
      const email = req.params.email;
      console.log("email", email);
      const result = await paymentHistory
        .find({ studentEmail: email.toLowerCase() || email.toUpperCase() })
        .toArray();

      if (result.length === 0) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });

    //-----Student Functionalities End-----//

    //-----Tutor Functionalities Start-----//
    //Get My Tuitions ok
    app.get("/tutorApplication/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      console.log("email", email);
      const result = await tutorApplicationCollection
        .find({ Email: email.toLowerCase() || email.toUpperCase() })
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

    //Tutor's Revenue History
    app.get("/tutorRevenue/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      console.log("email", email);
      const result = await paymentHistory
        .find({ tutorEmail: email.toLowerCase() || email.toUpperCase() })
        .toArray();

      if (result.length === 0) {
        return res.status(404).send({ message: "No result found" });
      }

      res.send({ result });
    });
    //-----Tutor Functionalities End-----//

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
