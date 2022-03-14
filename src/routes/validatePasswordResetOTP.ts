import express, { Request, Response } from "express";
import axios, { AxiosResponse } from 'axios';
import { Collection, Db, MongoClient } from 'mongodb';
import { DOJAH_API_PRIVATE_KEY, DOJAH_APP_ID} from '../app'

export function validatePasswordResetOTPRoutes(mongodbClient: MongoClient) {

    const router = express.Router()

    const database: Db = mongodbClient.db('accounts');
    const refIds: Collection = database.collection('refId');
    const users: Collection = database.collection('user');

    const validateOTPEndpoint: string = "https://api.dojah.io/api/v1/messaging/otp/validate";

    async function processValidateOTPResponse(res: AxiosResponse, optRefId: string) {
        console.log(res.data["entity"]["valid"])
        const isValid = res.data["entity"]["valid"]
        if (isValid) {
            const query = { "optRefId": optRefId }
            const result = await refIds.findOne(query);
            if (result) {
                console.log(`A document was found in optRefId with the _id: ${result._id} and optRefId: ${optRefId}`);
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
    router.post('/reset-password/validate-otp', (req: Request, res: Response) => {
        const optRefId = req.body.optRefId
        const code = req.body.code
    
        if (code == undefined || optRefId == undefined) {
            res.status(400).send("expecting code and optRefId in body")
            return
        }
    
        // validate OPT
        const queryParams = `?code=${code}&reference_id=${optRefId}`
        axios.get(
            validateOTPEndpoint + queryParams, 
            {
                headers: {
                    "Accept" : "text/plain", 
                    "AppId" : DOJAH_APP_ID, 
                    "Authorization" : DOJAH_API_PRIVATE_KEY
                }
            })
            .then(res => processValidateOPTResponse(res, optRefId))
            .catch(err => res.status(400).send("Invalid opt"))
            .then(isValid => res.send("OPT was " + String(isValid)))
    })

    return router
}