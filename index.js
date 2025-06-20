require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express()

const admin = require("firebase-admin");

const secret = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(secret)

const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middle ware
app.use(cors())
app.use(express.json())


// const logger = (req, res, next) =>{
//     console.log('inside the logger middleware');
//     next()
// }

// const verifyToken = (req, res, next) =>{
//   const token = req?.cookies?.token
//   // console.log('cookies in the middleware', token);

//   if(!token){
//     return res.status(401).send({message: 'unauthorized access'})
//   }
//   // verify token
//   jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=>{
//     if(err){
//       return res.status(401).send({message: 'unauthorized access'})
//     }
//     req.decoded = decoded
   
//     next()
//   })
// }


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dclhmji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyFirebaseToken = async(req,res,next)=>{
  const authHeader = req.headers.authorization
  //  console.log(authHeader);
  if(!authHeader || !authHeader.startsWith('Bearer ')){
     return res.status(401).send({message: 'unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
  
  try{
    const decoded = await admin.auth().verifyIdToken(token)
    console.log('this is token',decoded);
    req.decoded = decoded
    next()
  }
  catch (error){
   return res.status(401).send({message: 'unauthorized access'})
  }
}

const verifyTokenEmail = (req,res,next)=>{
  if(req.query.email !== req.decoded.email){
    return res.status(403).send({message: 'forbidden access'})
  }
  next()
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobCollection = client.db('career-code').collection('jobs')
    const jobApplication = client.db('career-code').collection('applications')

    // jwt token api
  //  app.post('/jwt', (req,res)=>{
  //     const userData = req.body
  //     const token = jwt.sign(userData, process.env.JWT_SECRET, {expiresIn: '1d'})
  //     // set the token in cookie 
  //     res.cookie('token', token, {
  //       httpOnly: true,
  //       secure: false
  //     })
  //     res.send({success: true})
  //  })

    app.get('/jobs', async (req, res) => {
      const email = req.query.email
      const query = {}
      if (email) {
        query.hr_email = email
      }
      // const result = await jobCollection.find(query).toArray()
      const cursor = jobCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    // could be done but should not to do
    // app.get('/jobsbyemail', async(req, res)=>{
    //    const email = req.query.email
    //    const query = {hr_email: email}
    //    const result = await jobCollection.find(query).toArray()
    //    res.send(result)
    // })


    app.get('/jobs/applications',verifyFirebaseToken,verifyTokenEmail, async(req, res)=>{
       const email = req.query.email

      //  if(email !== req.decoded.email){
      //     return res.status(401).send({message: 'forbidden access'})
      //  }
       const query = {hr_email: email}
       const jobs = await jobCollection.find(query).toArray()

       for(const job of jobs){
        const applicationQuery = {jobId: job._id.toString()}
        const application_count = await jobApplication.countDocuments(applicationQuery)
        job.application_count = application_count
       }

       res.send(jobs)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobCollection.findOne(query)
      res.send(result)
    })

    app.post('/jobs', async (req, res) => {
      const newjob = req.body
      const result = await jobCollection.insertOne(newjob)
      res.send(result)
    })

    app.get('/applications',verifyFirebaseToken,verifyTokenEmail,
       async (req, res) => {
     
      const email = req.query.email

      // console.log('cookies',req.cookies);
      // if(email !== req.decoded.email){
      //    return res.status(403).send({message: 'forbidden access'})
      // }

      const query = {
        applicant: email
      }
      const result = await jobApplication.find(query).toArray()
      // connect a collection with anouther collection
      // bad way
      for (const application of result) {
        const id = application.jobId
        const jobQuery = { _id: new ObjectId(id) }
        const job = await jobCollection.findOne(jobQuery)
        application.company = job.company
        application.title = job.title
        application.company_logo = job.company_logo
      }

      res.send(result)
    })

    app.get('/applications/job/:job_id', async (req, res) => {
      const job_id = req.params.job_id
      const query = { jobId: job_id }
      const result = await jobApplication.find(query).toArray()
      res.send(result)
    })

    app.patch('/applications/:id', async(req, res)=>{
       const id = req.params.id
       const filter = { _id: new ObjectId(id) }
       const updatedDoc = {
         $set: {
           status: req.body.status
         }
       }
       const result = await jobApplication.updateOne(filter, updatedDoc)
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