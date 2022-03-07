import { Console } from 'console';
import express, { Request, Response } from 'express';
import mongodb, { Collection, Db, MongoClient } from 'mongodb';
import 'dotenv/config';
import axios, { AxiosResponse } from 'axios';
import bcrypt from 'bcrypt';

const port = process.env.PORT || 5000;
const app = express();

const mongodbPort = "27017"
const mongodbEndpoint = `mongodb://localhost:${mongodbPort}`
const mongoClient = new MongoClient(mongodbEndpoint);
var database: Db
var users: Collection
var refIds: Collection

const dojahSendOTPEndpoint = "https://api.dojah.io/api/v1/messaging/otp"
const dojahValidateOTPEndpoint = "https://api.dojah.io/api/v1/messaging/otp/validate"
const dojahAppId = String(process.env.DOJAH_APP_ID)
const dojahApiPrivateKey = String(process.env.DOJAH_API_PRIVATE_KEY)

const testPhoneLink = "https://www.receivesms.co/us-phone-number/3471/"
const testPhoneNumber = "12099216581"

app.use(express.json())

async function run() {
    await mongoClient.connect();
    database = mongoClient.db('accounts');
    refIds = database.collection('refId');
    users = database.collection('user');
    console.log(`connected to mongodb: ${mongodbEndpoint}`)
}
run().catch(console.dir);

// updates the refId collection to store the phone number and the associated reference id
// If this phone number already exists, it updates it instead
async function processSendOPTResponse(res: AxiosResponse, phoneNumber: string, hash: string) {
    console.log(res.data["entity"][0]["reference_id"])
    const optRefId = res.data["entity"][0]["reference_id"]
    // TODO: handle condition where document with phone number already exists (race condition with more than 1 people registering the same phone number)

    // store the account, refId, password and salt
    const doc = {
        "phoneNumber": phoneNumber,
        "optRefId": optRefId,
        "password": hash
    }
    const result = await refIds.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId} and optRefId: ${optRefId}`);
    return optRefId
}

app.post('/signup', (req: Request, res: Response) => {
    console.log(req.body.phoneNumber)
    console.log(req.body.password)
    const plaintextPassword = req.body.password
    const phoneNumber = req.body.phoneNumber

    // validate phone number, make sure it doesn't already exist, is valid format
    const query = { "optRefId": optRefId }
    const result = refIds.findOne(query);
    if (phoneNumber !== testPhoneNumber) {
        return res.status(400).send("Phone number is not equal to test phone number")
    }

    // TODO: validate password

    // create salt and hash
    bcrypt.hash(plaintextPassword, 10, function(err, hash) {
        // Store hash in your password DB.
        if (err) return res.status(500).send("Unexpected error while hashing password")

        // send OPT
        const data = {
            "sender_id": "Dojah", 
            "destination": phoneNumber, 
            "channel": "sms"
        }
        axios.post(
            dojahSendOTPEndpoint, 
            data, 
            {
                headers: {
                    "Accept" : "text/plain", 
                    "AppId" : dojahAppId, 
                    "Authorization" : dojahApiPrivateKey,
                    "Content-Type" : "application/json"
                }
            })
            // store OPT ref id and hashed password and phone number
            .then(res => processSendOPTResponse(res, phoneNumber, hash))
            .catch(err => console.log(err))
            .then(optRefId => res.send(optRefId))
            
    });
});

async function processValidateOPTResponse(res: AxiosResponse, optRefId: string) {
    console.log(res.data["entity"]["valid"])
    const isValid = res.data["entity"]["valid"]
    if (isValid) {
        const query = { "optRefId": optRefId }
        const result = await refIds.findOne(query);
        if (result) {
            console.log(`A document was found with the _id: ${result._id} and optRefId: ${optRefId}`);
            console.log(`creating account for ${result}`)
            const user = {
                "phoneNumber": result.phoneNumber,
                "password": result.password
            }
            
            users.insertOne(user)
        } else {
            console.log("Error: opt was validated for request that was not processed by us")
            return false
        }
    }
    return isValid
}

// TODO: Make sure user also has right token
// Once OPT is validated, the account is created
app.post('/validateOPT', (req: Request, res: Response) => {
    const optRefId = req.body.optRefId
    const code = req.body.code

    if (code == undefined || optRefId == undefined) {
        res.status(400).send("expecting code and optRefId in body")
        return
    }

    // validate OPT
    const queryParams = `?code=${code}&reference_id=${optRefId}`
    axios.get(
        dojahValidateOTPEndpoint + queryParams, 
        {
            headers: {
                "Accept" : "text/plain", 
                "AppId" : dojahAppId, 
                "Authorization" : dojahApiPrivateKey
            }
        })
        .then(res => processValidateOPTResponse(res, optRefId))
        .catch(err => res.status(400).send("Invalid opt"))
        .then(isValid => res.send("OPT was " + String(isValid)))
})

// checks login request with database to see if phone number and password match
app.get('/login', (req: Request, res: Response) => {

    const plaintextPassword: string = String(req.query.password)
    const phoneNumber: string = String(req.query.phoneNumber)
    console.log(plaintextPassword)
    console.log(phoneNumber)

    // TODO: validate phone number and password are valid

    const query = { "phoneNumber" : phoneNumber}
    const result = users.findOne(query)
        .then(user => {
            if (user) {
                console.log(plaintextPassword)
                console.log(user.password)
                return bcrypt.compareSync(plaintextPassword, user.password)
            } else {
                // user not found
                return false
            }
        })
        .then(result => {
            if (result) {
                res.send("login successful")
            } else {
                res.send("phone number and password combination is invalid")
            }
        })
})

app.listen(port, () => console.log(`Server is running on ${port}`))