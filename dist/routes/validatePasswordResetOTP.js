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
exports.validatePasswordResetOTPRoutes = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const app_1 = require("../app");
function validatePasswordResetOTPRoutes(mongodbClient) {
    const router = express_1.default.Router();
    const database = mongodbClient.db('accounts');
    const refIds = database.collection('refId');
    const users = database.collection('user');
    const validateOTPEndpoint = "https://api.dojah.io/api/v1/messaging/otp/validate";
    function processValidateOPTResponse(res, optRefId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(res.data["entity"]["valid"]);
            const isValid = res.data["entity"]["valid"];
            if (isValid) {
                const query = { "optRefId": optRefId };
                const result = yield refIds.findOne(query);
                if (result) {
                    console.log(`A document was found in optRefId with the _id: ${result._id} and optRefId: ${optRefId}`);
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
    router.post('/reset-password/validate-otp', (req, res) => {
        const optRefId = req.body.optRefId;
        const code = req.body.code;
        if (code == undefined || optRefId == undefined) {
            res.status(400).send("expecting code and optRefId in body");
            return;
        }
        // validate OPT
        const queryParams = `?code=${code}&reference_id=${optRefId}`;
        axios_1.default.get(validateOTPEndpoint + queryParams, {
            headers: {
                "Accept": "text/plain",
                "AppId": app_1.DOJAH_APP_ID,
                "Authorization": app_1.DOJAH_API_PRIVATE_KEY
            }
        })
            .then(res => processValidateOPTResponse(res, optRefId))
            .catch(err => res.status(400).send("Invalid opt"))
            .then(isValid => res.send("OPT was " + String(isValid)));
    });
    return router;
}
exports.validatePasswordResetOTPRoutes = validatePasswordResetOTPRoutes;
