const express = require('express');
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config();

const stripe = require("stripe")(process.env.STRIPE_SK);

const port = process.env.PORT || 8080;

const jwtToken = process.env.JWT_TOKEN;

// middle wares

app.use(cors());
app.use(express.json());


 
// Replace the following with your Atlas connection string                                                                                                                                        
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRETKEY}@cluster0.w4va0jw.mongodb.net/?retryWrites=true&w=majority`;
// Connect to your Atlas cluster
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});
function verifyJWT(req, res, next){
    const authHeader = req.headers.authentication;
    if(!authHeader){
      res.status(401).send({message:'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, jwtToken, function(err, decoded){
      if(err){
        res.status(403).send({message:'Unauthorized access' })
      }
      req.decoded = decoded;
      next();
    });
  }

async function run() {

    try {
        const carCollection = client.db('carBuzz').collection('cars');
        const userCollection = client.db('carBuzz').collection('users');
        const bookingCollection = client.db('carBuzz').collection('bookings');

        app.post('/carDetails', async(req, res) => {
            const data = req.body;
            const result = await carCollection.insertOne(data);
            res.send(result)

        })
        app.post('/booking', verifyJWT, async(req, res)=>{
            const data = req.body;
            const verifiedJwtEmail = req.decoded.email;
            const query = {email: verifiedJwtEmail}
            if(verifiedJwtEmail){
                const existBooking = await bookingCollection.findOne(query)
                if(existBooking){
                    return res.send({message:'You have already Booked One!'})
                }
            }
            const result = await bookingCollection.insertOne(data);
            res.send(result)
        })
        app.get('/allusers', async(req, res)=>{
            const query = {}
            const cursor =  userCollection.find(query)
            const allusers = await cursor.toArray();
            res.send(allusers);
        })
        app.post('/user', async(req, res)=>{
            const data = req.body;
            const email = data.email;
            const query = {email: email}
            const tocken = jwt.sign({email: email}, jwtToken);
            const userExist = await userCollection.findOne(query)
                if(userExist){
                    return res.send({result:email, tocken});
                }
            
            const result = await userCollection.insertOne(data);
            res.send({result, tocken})
        })
        app.get('/orders', verifyJWT, async(req, res)=>{
            const verifiedJwtEmail = req.decoded.email;
            const query = {email: verifiedJwtEmail}
                const existBooking = await bookingCollection.findOne(query)
                res.send(existBooking);
            
        })
        app.get('/cars', async(req, res)=>{
            const query = {}
            const cursor = carCollection.find(query).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get('/allCars', async(req, res)=>{
            const query = {}
            const cursor = carCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get('/singleuser',verifyJWT, async(req, res)=>{
            const email = req.query.email;
            const query = { email: email}
            const verifiedJwtEmail = req.decoded.email;
            
            if(verifiedJwtEmail === email){
                const result  = await userCollection.findOne(query);
                return res.send(result);
            }
            else{
                return res.status(401).json('Email not found!')
            }
        })
        app.delete('/revmoveUser/:id',verifyJWT, async(req, res)=>{
            const id = req.params.id;
            
            const query = { _id: new ObjectId(`${id}`)}
            const verifiedJwtEmail = req.decoded.email;
            if(verifiedJwtEmail){
                const result  = await userCollection.deleteOne(query);
                return res.send(result);
            }
            else{
                return res.status(401).json('Email not found!')
            }
        })
        app.delete('/removeOrder/:id',verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const query = { _id: new ObjectId(`${id}`)}
            const verifiedJwtEmail = req.decoded.email;
            if(verifiedJwtEmail){
                const result  = await bookingCollection.deleteOne(query);
                return res.send(result);
            }
            else{
                return res.status(401).json('Email not found!')
            }
        })
        app.get('/product/:id',async(req, res)=>{
            const id = req.params.id;
            const query = {
                _id: new ObjectId(`${id}`)
            }
            const existBooking = await bookingCollection.findOne(query)
                res.send(existBooking);
        })
        app.post('/create-payment-intent', async(req, res)=>{
            const booking = req.body;
            const price = booking.price;
            const amount = price*100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'USD',
                amount: amount,
                "payment_method_types": [
                    'card'
                ]
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
              });
        })

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        
    }
}
run().catch(e => console.error(e));

app.get('/', (req, res)=>{
    res.send('Car Buzz is Running');

})
app.listen(port, ()=>{
    console.log(`Car Buzz server Running on port: ${port}`);
})
