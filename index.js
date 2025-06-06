require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dclhmji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobCollection = client.db('career-code').collection('jobs')
    const jobApplication = client.db('career-code').collection('applications')

    app.get('/jobs', async (req, res) => {
      const result = await jobCollection.find().toArray()
      res.send(result)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobCollection.findOne(query)
      res.send(result)
    })

    app.get('/applications', async (req, res) => {
      const email = req.query.email
      const query = {
        applicant : email
      }
      const result = await jobApplication.find(query).toArray()

      // connect a collection with anouther collection
      // bad way
      for(const application of result){
        const id = application.jobId
        const jobQuery = {_id : new ObjectId(id)}
        const job = await jobCollection.findOne(jobQuery)
        application.company = job.company
        application.title = job.title
        application.company_logo = job.company_logo
      }

      res.send(result)
    })

    app.post('/applications', async (req, res) => {
      const application = req.body
      const result = await jobApplication.insertOne(application)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('carrer code is running')
})

app.listen(port, () => {
  console.log(`carrer code is running on port: ${port}`);
})