import 'dotenv/config';

import express from 'express';

import {  MongoClient } from 'mongodb';

import { signupRoutes } from './routes/signup'
import { validateOPTRoutes } from './routes/validateOPT';
import { loginRoutes } from './routes/login'
import { exit } from 'process';

import axios from 'axios';
import * as AxiosLogger from 'axios-logger';

const port = process.env.PORT || 5000;
const app = express();

const mongodbPort = "27017"
const mongodbEndpoint = `mongodb://localhost:${mongodbPort}`
const mongoClient = new MongoClient(mongodbEndpoint);

export var DOJAH_API_PRIVATE_KEY: string;
export var DOJAH_APP_ID: string;

axios.interceptors.request.use(AxiosLogger.requestLogger);
axios.interceptors.response.use(AxiosLogger.responseLogger);

function loadEnvVariables() {
    if (!process.env.DOJAH_API_PRIVATE_KEY) {
        console.log("missing dojah private key");
        exit()
    }
    if (!process.env.DOJAH_APP_ID) {
        console.log("missing dojah app id");
        exit()
    }
    
    DOJAH_API_PRIVATE_KEY = String(process.env.DOJAH_API_PRIVATE_KEY);
    DOJAH_APP_ID = String(process.env.DOJAH_APP_ID);
}

async function run() {
    await mongoClient.connect().catch(err => {
        console.log(err);
        exit()
    });
    console.log(`connected to mongodb: ${mongodbEndpoint}`)
    // parse requests json payloads
    app.use(express.json())
    // add routes
    app.use(signupRoutes(mongoClient))
    app.use(validateOPTRoutes(mongoClient))
    app.use(loginRoutes(mongoClient))

    app.listen(port, () => console.log(`Server is running on ${port}`))
}

loadEnvVariables();

run().catch(console.dir);