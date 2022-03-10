import express, { Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import { Collection, Db, MongoClient } from "mongodb";
import { DOJAH_API_PRIVATE_KEY, DOJAH_APP_ID } from "../app";
import { ErrorHandler } from "../components/ErrorHandler";
import { validateRequestInput } from '../components/validateRequestInput'

export function passwordResetRoutes(mongodbClient: MongoClient) {
  const router = express.Router();

  const database: Db = mongodbClient.db("accounts");
  const refIds: Collection = database.collection("refId");
  const sendOptEndpoint: string = "https://api.dojah.io/api/v1/messaging/otp";

  router.post("/reset-password", (req: Request, res: Response) => {
    const phoneNumber = req.body.phoneNumber;

    const expectedParameters: Array<[string, string]> = [["phoneNumber", phoneNumber]]

    const error: ErrorHandler | undefined = validateRequestInput(res, expectedParameters)
    if (error) {
        return error.send()
    }

    // validate phone number, make sure it is given in the request, and is valid.
    if (!phoneNumber) {
      let error = new ErrorHandler(res);
      error.setMessage("Invalid Input");
      error.addInputError(
        "phoneNumber",
        "A phone number is required for this action."
      );
      return error.send();
    }

    // TODO: send OTP
    const data = {
      sender_id: "Dojah",
      destination: phoneNumber,
      channel: "sms",
    };
    axios
      .post(sendOptEndpoint, data, {
        headers: {
          Accept: "text/plain",
          AppId: DOJAH_APP_ID,
          Authorization: DOJAH_API_PRIVATE_KEY,
          "Content-Type": "application/json",
        },
      })
      // store OTP ref id and phone number
      .then((res) => processSendOPTResponse(res, phoneNumber))
      .catch((err) => console.log(err))
      .then((optRefId) => res.send(optRefId));
  });

  // updates the refId collection to store the phone number and the associated reference id
  // If this phone number already exists, it updates it instead
  async function processSendOPTResponse(
    res: AxiosResponse,
    phoneNumber: string
  ) {
    const optRefId = res.data["entity"][0]["reference_id"];
    // TODO: handle condition where document with phone number already exists (race condition with more than 1 people registering the same phone number)

    // store the account, refId, password and salt
    const doc = {
      phoneNumber: phoneNumber,
      optRefId: optRefId,
      // "password": hash
    };
    const result = await refIds.insertOne(doc);
    console.log(
      `A document was inserted into refIds with the _id: ${result.insertedId} and optRefId: ${optRefId}`
    );
    return optRefId;
  }

  return router;
}
