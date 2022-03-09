import express, { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import bcrypt from 'bcrypt';
import { Collection, Db, MongoClient } from 'mongodb';
import { DOJAH_API_PRIVATE_KEY, DOJAH_APP_ID} from '../app'

export function signupRoutes(mongodbClient: MongoClient) {

    const router = express.Router()

    const database: Db = mongodbClient.db('accounts');
    const refIds: Collection = database.collection('refId');
    const users: Collection = database.collection('user');

    const sendOptEndpoint: string = "https://api.dojah.io/api/v1/messaging/otp";

    // see sms messages sent here: https://www.receivesms.co/us-phone-number/3471/
    const testPhoneNumber = "12099216581"

    // updates the refId collection to store the phone number and the associated reference id
    // If this phone number already exists, it updates it instead
    async function processSendOPTResponse(res: AxiosResponse, phoneNumber: string, hash: string) {
        const optRefId = res.data["entity"][0]["reference_id"]
        // TODO: handle condition where document with phone number already exists (race condition with more than 1 people registering the same phone number)

        // store the account, refId, password and salt
        const doc = {
            "phoneNumber": phoneNumber,
            "optRefId": optRefId,
            "password": hash,
            "createdAt": new Date()
        }
        const result = await refIds.insertOne(doc);
        console.log(`A document was inserted into refIds with the _id: ${result.insertedId} and optRefId: ${optRefId}`);
        return optRefId
    }

    router.post('/signup', async (req: Request, res: Response) => {
        const plaintextPassword: string = String(req.body.password)
        const phoneNumber: string = String(req.body.phoneNumber)

        // validate phone number, make sure it doesn't already exist, is valid format

        // make sure phone number doesn't already exist in database
        const query = { "phoneNumber": phoneNumber }
        const user = await users.findOne(query)
        if (user) {
            return res.status(400).send("Account exists for phone number")
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
                sendOptEndpoint, 
                data, 
                {
                    headers: {
                        "Accept" : "text/plain", 
                        "AppId" : DOJAH_APP_ID, 
                        "Authorization" : DOJAH_API_PRIVATE_KEY,
                        "Content-Type" : "application/json"
                    }
                })
                // store OPT ref id and hashed password and phone number
                .then(optRes => {
                    const status = optRes.data["entity"][0]["status"]
                    const message = optRes.data["entity"][0]["message"]
                    if (status === 400) {
                        return res.status(400).send("unable to create OPT: " + message)
                    }
                    processSendOPTResponse(optRes, phoneNumber, hash);
                })
                .catch(err => console.log(err))
                .then(optRefId => res.send(optRefId))
                
        });
    });

    return router
}