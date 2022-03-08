"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
function loginRoutes(mongodbClient) {
    const router = express_1.default.Router();
    const database = mongodbClient.db('accounts');
    const users = database.collection('user');
    // checks login request with database to see if phone number and password match
    router.get('/login', (req, res) => {
        const plaintextPassword = String(req.query.password);
        const phoneNumber = String(req.query.phoneNumber);
        console.log(plaintextPassword);
        console.log(phoneNumber);
        // TODO: validate phone number and password are valid
        const query = { "phoneNumber": phoneNumber };
        const result = users.findOne(query)
            .then(user => {
            if (user) {
                console.log(plaintextPassword);
                console.log(user.password);
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