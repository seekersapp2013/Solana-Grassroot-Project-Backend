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
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const port = process.env.PORT || 5000;
const app = (0, express_1.default)();
const mongodbPort = "27017";
const mongodbEndpoint = `mongodb://localhost:${mongodbPort}`;
const mongoClient = new mongodb_1.MongoClient(mongodbEndpoint);
var database;
var users;
var refIds;
const dojahSendOTPEndpoint = "https://api.dojah.io/api/v1/messaging/otp";
const dojahValidateOTPEndpoint = "https://api.dojah.io/api/v1/messaging/otp/validate";
const dojahAppId = String(process.env.DOJAH_APP_ID);
const dojahApiPrivateKey = String(process.env.DOJAH_API_PRIVATE_KEY);
const testPhoneLink = "https://www.receivesms.co/us-phone-number/3471/";
const testPhoneNumber = "12099216581";
app.use(express_1.default.json());
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoClient.connect();
        database = mongoClient.db('accounts');
        refIds = database.collection('refId');
        console.log(`connected to mongodb: ${mongodbEndpoint}`);
    });
}
run().catch(console.dir);
// updates the refId collection to store the phone number and the associated reference id
// If this phone number already exists, it updates it instead
function processSendOPTResponse(res, phoneNumber, hash) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(res.data["entity"][0]["reference_id"]);
        const optRefId = res.data["entity"][0]["reference_id"];
        // TODO: handle condition where document with phone number already exists (race condition with more than 1 people registering the same phone number)
        // store the account, refId, password and salt
        const doc = {
            "phoneNumber": phoneNumber,
            "optRefId": optRefId,
            "password": hash
        };
        const result = yield refIds.insertOne(doc);
        console.log(`A document was inserted with the _id: ${result.insertedId} and optRefId: ${optRefId}`);
        return optRefId;
    });
}
app.post('/signup', (req, res) => {
    console.log(req.body.phoneNumber);
    console.log(req.body.password);
    const plaintextPassword = req.body.password;
    const phoneNumber = req.body.phoneNumber;
    // validate phone number, make sure it doesn't already exist, is valid format
    if (phoneNumber !== testPhoneNumber) {
        return res.status(400).send("Phone number is not equal to test phone number");
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
        axios_1.default.post(dojahSendOTPEndpoint, data, {
            headers: {
                "Accept": "text/plain",
                "AppId": dojahAppId,
                "Authorization": dojahApiPrivateKey,
                "Content-Type": "application/json"
            }
        })
            // store OPT ref id and hashed password and phone number
            .then(res => processSendOPTResponse(res, phoneNumber, hash))
            .catch(err => console.log(err))
            .then(optRefId => res.send(optRefId));
    });
});
function processValidateOPTResponse(res, optRefId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(res.data["entity"]["valid"]);
        const isValid = res.data["entity"]["valid"];
        if (isValid) {
            const query = { "optRefId": optRefId };
            const result = yield refIds.findOne(query);
            if (result) {
                console.log(`A document was found with the _id: ${result._id} and optRefId: ${optRefId}`);
                console.log(`creating account for ${result}`);
                const user = {
                    "phoneNumber": result.phoneNumber,
                    "password": result.password
                };
                users.insertOne(user);
            }
            else {
                console.log("Error: opt was validated for request that was not processed by us");
                return false;
            }
        }
        return isValid;
    });
}
// TODO: Make sure user also has right token
// Once OPT is validated, the account is created
app.post('/validateOPT', (req, res) => {
    const optRefId = req.body.optRefId;
    const code = req.body.code;
    // validate OPT
    const queryParams = `?code=${code}&reference_id=${optRefId}`;
    axios_1.default.get(dojahValidateOTPEndpoint + queryParams, {
        headers: {
            "Accept": "text/plain",
            "AppId": dojahAppId,
            "Authorization": dojahApiPrivateKey
        }
    })
        .then(res => processValidateOPTResponse(res, optRefId))
        .catch(err => res.status(400).send("Invalid opt"))
        .then(isValid => res.send("OPT was " + String(isValid)));
});
app.get('/login', (req, res) => {
    res.send("hello");
});
app.listen(port, () => console.log(`Server is running on ${port}`));
