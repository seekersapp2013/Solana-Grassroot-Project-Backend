import express, { Request, Response } from "express";
import { Collection, Db, MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import { ErrorHandler } from "../components/ErrorHandler";
import { validateRequestInput } from '../components/validateRequestInput'


export function loginRoutes(mongodbClient: MongoClient) {

    const router = express.Router()
    const database: Db = mongodbClient.db('accounts');
    const users: Collection = database.collection('user');

    // checks login request with database to see if phone number and password match
    router.post('/login', (req: Request, res: Response) => {

        const plaintextPassword = req.body.password
        const phoneNumber = req.body.phoneNumber
        const expectedParameters: Array<[string, string]> = [["phoneNumber", phoneNumber], ["password", plaintextPassword]]

        const error: ErrorHandler | undefined = validateRequestInput(res, expectedParameters)
        if (error) {
            return error.send()
        }

        // TODO: validate phone number and password are valid
        const query = { "phoneNumber" : phoneNumber}
        const result = users.findOne(query)
            .then(user => {
                if (user) {
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

    return router
}