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
exports.passwordResetRoutes = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const app_1 = require("../app");
const ErrorHandler_1 = require("../components/ErrorHandler");
function passwordResetRoutes(mongodbClient) {
    const router = express_1.default.Router();
    const database = mongodbClient.db("accounts");
    const refIds = database.collection("refId");
    const sendOptEndpoint = "https://api.dojah.io/api/v1/messaging/otp";
    // updates the refId collection to store the phone number and the associated reference id
    // If this phone number already exists, it updates it instead
    function processSendOPTResponse(res, phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const optRefId = res.data["entity"][0]["reference_id"];
            // TODO: handle condition where document with phone number already exists (race condition with more than 1 people registering the same phone number)
            // store the account, refId, password and salt
            const doc = {
                phoneNumber: phoneNumber,
                optRefId: optRefId,
                // "password": hash
            };
            const result = yield refIds.insertOne(doc);
            console.log(`A document was inserted into refIds with the _id: ${result.insertedId} and optRefId: ${optRefId}`);
            return optRefId;
        });
    }
    router.post("/reset-password", (req, res) => {
        const phoneNumber = req.body.phoneNumber;
        // validate phone number, make sure it is given in the request, and is valid.
        if (!phoneNumber) {
            let error = new ErrorHandler_1.ErrorHandler(res);
            error.setMessage("Invalid Input");
            error.addInputError("phoneNumber", "A phone number is required for this action.");
            return error.send();
        }
        // TODO: send OTP
        const data = {
            sender_id: "Dojah",
            destination: phoneNumber,
            channel: "sms",
        };
        axios_1.default
            .post(sendOptEndpoint, data, {
            headers: {
                Accept: "text/plain",
                AppId: app_1.DOJAH_APP_ID,
                Authorization: app_1.DOJAH_API_PRIVATE_KEY,
                "Content-Type": "application/json",
            },
        })
            // store OTP ref id and phone number
            .then((res) => processSendOPTResponse(res, phoneNumber))
            .catch((err) => console.log(err))
            .then((optRefId) => res.send(optRefId));
    });
    return router;
}
exports.passwordResetRoutes = passwordResetRoutes;
