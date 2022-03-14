"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.MONGODB_ENDPOINT = exports.DOJAH_APP_ID = exports.DOJAH_API_PRIVATE_KEY = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const signup_1 = require("./routes/signup");
const validateOPT_1 = require("./routes/validateOPT");
const login_1 = require("./routes/login");
const process_1 = require("process");
const axios_1 = __importDefault(require("axios"));
const AxiosLogger = __importStar(require("axios-logger"));
const port = process.env.PORT || 5000;
const app = (0, express_1.default)();
axios_1.default.interceptors.request.use(AxiosLogger.requestLogger);
axios_1.default.interceptors.response.use(AxiosLogger.responseLogger);
function loadEnvVariables() {
    if (!process.env.DOJAH_API_PRIVATE_KEY) {
        console.log("missing dojah private key");
        (0, process_1.exit)();
    }
    if (!process.env.DOJAH_APP_ID) {
        console.log("missing dojah app id");
        (0, process_1.exit)();
    }
    if (!process.env.MONGODB_ENDPOINT) {
        console.log("missing mongodb_endpoint");
        (0, process_1.exit)();
    }
    exports.MONGODB_ENDPOINT = String(process.env.MONGODB_ENDPOINT);
    exports.DOJAH_API_PRIVATE_KEY = String(process.env.DOJAH_API_PRIVATE_KEY);
    exports.DOJAH_APP_ID = String(process.env.DOJAH_APP_ID);
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const mongoClient = new mongodb_1.MongoClient(exports.MONGODB_ENDPOINT);
        yield mongoClient.connect().catch(err => {
            console.log(err);
            (0, process_1.exit)();
        });
        console.log(`connected to mongodb: ${exports.MONGODB_ENDPOINT}`);
        // parse requests json payloads
        app.use(express_1.default.json());
        // add routes
        app.use((0, signup_1.signupRoutes)(mongoClient));
        app.use((0, validateOPT_1.validateOPTRoutes)(mongoClient));
        app.use((0, login_1.loginRoutes)(mongoClient));
        app.listen(port, () => console.log(`Server is running on ${port}`));
    });
}
loadEnvVariables();
run().catch(console.dir);
