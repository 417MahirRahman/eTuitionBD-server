const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8rpbzhd.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//Verify JWT Token
const verifyJWTToken = (req, res, next) => {
  
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message: 'Unauthorized Access'})
  }
  const token = authorization.split(' ')[1];
  if(!token){
    return res.status(401).send({message: 'Unauthorized Access'})
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'Unauthorized Access'})
    }
    req.token_email = decoded.email;
    next();
  }) 
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //dataBase, Collection
    const dataBase = client.db('eTuitionBD')
    const tuitionPostCollection = dataBase.collection('Tuition_Post')

    //JWT API's
    app.post('/getToken', (req, res) => {
      const loggedUser = req.body;
      const token = jwt.sign(loggedUser, process.env.JWT_SECRET, {expiresIn: '1h'})
      res.send({token: token})
    })

    //Get all tuitions
    app.get('/allTuitions', async(req, res) => {
        
        const result = await tuitionPostCollection.find().toArray()

        res.send(result)
    })

    // Get a specific tuition by ID
    app.get('/allTuitions/:id', async(req, res) => {
        const {id} = req.params
        const result = await tuitionPostCollection.findOne({_id: new ObjectId(id)})

        res.send({
            success: true,
            result
        })
    })

    //-----Student Functionalities-----//
    //New Tuition Post
    app.post('/tuitionPost', async(req, res) => {
        const data = req.body
        const result = await tuitionPostCollection.insertOne(data)

        res.send({
            success: true,
            result
        })
    })

    //Delete Tuition Post
    app.delete('/tuitionPost/:id', async(req, res) => {
        const {id} = req.params
        const objectId = new ObjectId(id)
        const filter = {_id: objectId}

        const result = await collection.deleteOne({filter})

        req.send({
            success: true,
            result
        })
    })

    app.put('/demo/:id', async(req, res) => {
        const {id} = req.params
        const data = req.body
        const objectId = new ObjectId(id)

        const filter = {_id: objectId}
        const update = {
            $set: data
        }
        const result = await collection.updateOne({filter, update})

        res.send({
            success: true,
            result
        })
    })

    app.delete('/demo/id', async(req, res) => {
        const {id} = req.params
        const objectId = new ObjectId(id)
        const filter = {_id: objectId}

        const result = await collection.deleteOne({filter})

        req.send({
            success: true,
            result
        })
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(port, () => {
  console.log(`The Server is Running on port ${port}`)
})
