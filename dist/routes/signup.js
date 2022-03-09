"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupRoutes = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const app_1 = require("../app");
function signupRoutes(mongodbClient) {
    const router = express_1.default.Router();
    const database = mongodbClient.db('accounts');
    const refIds = database.collection('refId');
    const users = database.collection('user');
    const sendOptEndpoint = "https://api.dojah.io/api/v1/messaging/otp";
    // see sms messages sent here: https://www.receivesms.co/us-phone-number/3471/
    const testPhoneNumber = "12099216581";
    // updates the refId collection to store the phone number and the associated reference id
    // If this phone number already exists, it updates it instead
    function processSendOPTResponse(res, phoneNumber, hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const optRefId = res.data["entity"][0]["reference_id"];
            // TODO: handle condition where document with phone number already exists (race condition with more than 1 people registering the same phone number)
            // store the account, refId, password and salt
            const doc = {
                "phoneNumber": phoneNumber,
                "optRefId": optRefId,
                "password": hash,
                "createdAt": new Date()
            };
            const result = yield refIds.insertOne(doc);
            console.log(`A document was inserted into refIds with the _id: ${result.insertedId} and optRefId: ${optRefId}`);
            return optRefId;
        });
    }
    router.post('/signup', (req, res) => __awaiter(this, void 0, void 0, function* () {
        const plaintextPassword = String(req.body.password);
        const phoneNumber = String(req.body.phoneNumber);
        // validate phone number, make sure it doesn't already exist, is valid format
        // make sure phone number doesn't already exist in database
        const query = { "phoneNumber": phoneNumber };
        const user = yield users.findOne(query);
        if (user) {
            return res.status(400).send("Account exists for phone number");
        }
        // TODO: validate password
        // create salt and hash
        bcrypt_1.default.hash(plaintextPassword, 10, function (err, hash) {
            // Store hash in your password DB.
            if (err)
                return res.status(500).send("Unexpected error while hashing password");
            // send OPT
            const data = {
                "sender_id": "Dojah",
                "destination": phoneNumber,
                "channel": "sms"
            };
            axios_1.default.post(sendOptEndpoint, data, {
                headers: {
                    "Accept": "text/plain",
                    "AppId": app_1.DOJAH_APP_ID,
                    "Authorization": app_1.DOJAH_API_PRIVATE_KEY,
                    "Content-Type": "application/json"
                }
            })
                // store OPT ref id and hashed password and phone number
                .then(optRes => {
                const status = optRes.data["entity"][0]["status"];
                const message = optRes.data["entity"][0]["message"];
                if (status === 400) {
                    return res.status(400).send("unable to create OPT: " + message);
                }
                processSendOPTResponse(optRes, phoneNumber, hash);
            })
                .catch(err => console.log(err))
                .then(optRefId => res.send(optRefId));
        });
    }));
    return router;
}
exports.signupRoutes = signupRoutes;
