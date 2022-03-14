import express, { Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import bcrypt from "bcrypt";
import { Collection, Db, MongoClient } from "mongodb";
import { DOJAH_API_PRIVATE_KEY, DOJAH_APP_ID } from "../app";

export function createProfileRoutes(mongodbClient: MongoClient) {
  const router = express.Router();

  const database: Db = mongodbClient.db("solana-grassroot-project");
  const profiles: Collection = database.collection("profiles");

  interface Profile {
    publicAddress: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    dob: string;
    bvn: string;
    ssn: string;
    photo: string;
  }

  // updates the refId collection to store the phone number and the associated reference id
  // If this phone number already exists, it updates it instead
  async function setProfile(doc: Profile) {
    // store the account
    const result = await profiles.insertOne(doc);
    
    if (result) {
      return true;
    } else {
      return false;
    }
  }

  router.post("/create-profile", (req: Request, res: Response) => {
    const {
      publicAddress,
      email,
      phone,
      firstName,
      lastName,
      dob,
      bvn,
      ssn,
      photo,
    } = req.body;

    setProfile({
      publicAddress,
      email,
      phone,
      firstName,
      lastName,
      dob,
      bvn,
      ssn,
      photo,
    });

    res.send(req.body);

    // res.send({
    //   publicAddress: "Hello",
    //   email,
    //   phone,
    //   firstName,
    //   lastName,
    //   dob,
    //   bvn,
    //   ssn,
    //   photo,
    // });
  });

  return router;
}

// const validateName = (key: string, value: string): string | boolean => {
//   const isRequired = requiredError(key, value);
//   if (isRequired) {
//     return isRequired;
//   } else {
//     return true;
//   }
// };

// const validatePhone = (key: string, value: string): string | boolean => {
//   const isRequired = requiredError(key, value);
//   if (isRequired) {
//     return isRequired;
//   } else if (value.length > 5 && value.length <= 10) {
//     return `Please enter a valid ${key}`;
//   } else {
//     return true;
//   }
// };

// const requiredError = (key: string, value: string): string | boolean =>
//   !value ? `${key} is required` : true;
