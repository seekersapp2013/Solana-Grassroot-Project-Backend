"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const validateRequestInput_1 = require("../components/validateRequestInput");
function loginRoutes(mongodbClient) {
    const router = express_1.default.Router();
    const database = mongodbClient.db('accounts');
    const users = database.collection('user');
    // checks login request with database to see if phone number and password match
    router.post('/login', (req, res) => {
        const plaintextPassword = req.body.password;
        const phoneNumber = req.body.phoneNumber;
        const expectedParameters = [["phoneNumber", phoneNumber], ["password", plaintextPassword]];
        const error = (0, validateRequestInput_1.validateRequestInput)(res, expectedParameters);
        if (error) {
            return error.send();
        }
        // TODO: validate phone number and password are valid
        const query = { "phoneNumber": phoneNumber };
        const result = users.findOne(query)
            .then(user => {
            if (user) {
                return bcrypt_1.default.compareSync(plaintextPassword, user.password);
            }
            else {
                // user not found
                return false;
            }
        })
            .then(result => {
            if (result) {
                res.send("login successful");
            }
            else {
                res.send("phone number and password combination is invalid");
            }
        });
    });
    return router;
}
exports.loginRoutes = loginRoutes;
