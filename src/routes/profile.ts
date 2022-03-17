import express, { Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import bcrypt from "bcrypt";
import { Collection, Db, MongoClient } from "mongodb";
import { DOJAH_API_PRIVATE_KEY, DOJAH_APP_ID } from "../app";
import { ErrorHandler } from "../components/ErrorHandler";
import { ResponseHandler } from "../components/ResponseHandler";
import ProfileHandler from "../components/ProfileHandler";
import { WalletHandler } from "../components/WalletHandler";

export function profileRoutes(mongodbClient: MongoClient) {
  const router = express.Router();

  const unAuthedError = (res: Response) =>
    new ErrorHandler(
      res,
      401,
      "The public address provided could not be validated."
    ).send();

  router.options("/profile", (req: Request, res: Response) => {
    // res.append("Access-Control-Allow-Origin", ["*"]);
    // res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    // res.append("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).send("Good");
  });

  router.get("/profile", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization;
    if (publicAddress) {
      const profile = new ProfileHandler(mongodbClient, publicAddress);

      profile.getProfile().then((data) => {
        if (data) {
          new ResponseHandler(res, true, "Query successful", data).send();
        } else {
          new ErrorHandler(
            res,
            500,
            "Could not get profile information."
          ).send();
        }
      });
    } else {
      unAuthedError(res);
    }
  });

  router.post("/profile", (req: Request, res: Response) => {
    const { email, phone, firstName, lastName, dob, bvn, ssn, photo } =
      req.body;
    console.log(req.headers.authorization);

    if (req.headers.authorization) {
      const publicAddress = req.headers.authorization;

      const data = {
        email,
        phone,
        firstName,
        lastName,
        dob,
        bvn,
        ssn,
        photo,
      };

      const profile = new ProfileHandler(mongodbClient, publicAddress);
      const wallet = new WalletHandler(mongodbClient, publicAddress);

      profile.createProfile(data).then(async (result) => {
        if (result) {
          await wallet.create();
          new ResponseHandler(res, true, "Query successful", data).send();
        } else {
          new ErrorHandler(
            res,
            500,
            "Could not create profile."
          ).send();
        }
      });
    } else {
      unAuthedError(res);
    }
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
