import "dotenv/config";

import express from "express";

import { MongoClient } from "mongodb";

import { signupRoutes } from "./routes/signup";
import { validateOPTRoutes } from "./routes/validateOPT";
import { loginRoutes } from "./routes/login";
import { exit } from "process";

import axios from "axios";
import * as AxiosLogger from "axios-logger";
import { profileRoutes } from "./routes/profile";
import { walletRoutes } from "./routes/wallet";

const port = process.env.PORT || 5000;
const app = express();

// const mongodbPort = "27017"
// const mongodbEndpoint = `mongodb://localhost:${mongodbPort}`;
// const mongodbEndpoint = process.env.MONGODB_ENDPOINT || "mongodb://localhost:27017";
// const mongoClient = new MongoClient(mongodbEndpoint);

export var DOJAH_API_PRIVATE_KEY: string;
export var DOJAH_APP_ID: string;
export var MONGODB_ENDPOINT: string;
export var SOLANA_WALLET: string;

axios.interceptors.request.use(AxiosLogger.requestLogger);
axios.interceptors.response.use(AxiosLogger.responseLogger);

function loadEnvVariables() {
  if (!process.env.DOJAH_API_PRIVATE_KEY) {
    console.log("missing dojah private key");
    exit();
  }
  if (!process.env.DOJAH_APP_ID) {
    console.log("missing dojah app id");
    exit();
  }
  if (!process.env.MONGODB_ENDPOINT) {
    console.log("missing mongodb_endpoint");
    exit();
  }
  if (!process.env.SOLANA_WALLET) {
    console.log("missing solana wallet");
    exit();
  }

  MONGODB_ENDPOINT = String(process.env.MONGODB_ENDPOINT);
  DOJAH_API_PRIVATE_KEY = String(process.env.DOJAH_API_PRIVATE_KEY);
  DOJAH_APP_ID = String(process.env.DOJAH_APP_ID);
  SOLANA_WALLET = String(process.env.SOLANA_WALLET);
}

async function run() {
  const mongoClient = new MongoClient(MONGODB_ENDPOINT);

  await mongoClient.connect().catch((err) => {
    console.log(err);
    exit();
  });
  console.log(`connected to mongodb: ${MONGODB_ENDPOINT}`);

  app.use((req, res, next) => {
    res.append("Access-Control-Allow-Origin", "*");
    res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.append("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
  });
  // parse requests json payloads
  app.use(express.json());
  // add routes
  app.use(walletRoutes(mongoClient));
  app.use(profileRoutes(mongoClient));
  app.use(signupRoutes(mongoClient));
  app.use(validateOPTRoutes(mongoClient));
  app.use(loginRoutes(mongoClient));

  app.listen(port, () => console.log(`Server is running on ${port}`));
}

loadEnvVariables();

run().catch(console.dir);
