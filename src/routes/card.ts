import express, { Request, Response } from "express";
import { Collection, Db, MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { ErrorHandler } from "../components/ErrorHandler";
import { validateRequestInput } from "../components/validateRequestInput";
import { WalletHandler } from "../components/WalletHandler";
import { ResponseHandler } from "../components/ResponseHandler";
import { SolanaPay, SolanaPayInit } from "../components/SolanaPay";
import BigNumber from "bignumber.js";
import SolanaPayRecord from "../components/SolanaPayRecord";
import ProfileHandler from "../components/ProfileHandler";
import { CardHandler } from "../components/CardHandler";
import { unAuthedError } from "../constants";
import axios from "axios";

export function cardRoutes(mongodbClient: MongoClient) {
  const router = express.Router();
  const database: Db = mongodbClient.db("accounts");
  const cards: Collection = database.collection("cards");

  router.get("/cards/test", (req: Request, res: Response) => {
    axios
      .get("https://sandbox.wallets.africa/cards/Idtypes", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WALLETS_AFRICA_PUBLIC_KEY}`,
        },
      })
      .then((result) => {
        console.log(result);
        new ResponseHandler(res, true, "Successfully", result.data).send();
      });
  });

  router.post("/cards/new", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization || "";

    new ProfileHandler(mongodbClient, publicAddress)
      .validatePublicAddress()
      .then(async (result) => {
        if (result) {
          const details = req.body;

          const cards = new CardHandler(mongodbClient, publicAddress);
          const card = await cards.create(details);

          if (card) {
            new ResponseHandler(
              res,
              true,
              "Card created successfully",
              card
            ).send();
          } else {
            new ErrorHandler(res, 500, "Card could not be created").send();
          }
        } else {
          unAuthedError(res);
        }
      });
  });

  router.get("/cards", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization;
    if (publicAddress) {
      const card = new CardHandler(mongodbClient, publicAddress);
      card.getCards().then((result) => {
        if (result) {
          new ResponseHandler(res, true, "Query successful", result).send();
        } else {
          new ErrorHandler(res, 500, "Could not get cards.").send();
        }
      });
    } else {
      unAuthedError(res);
    }
  });

  //   router.get("/cards/balance", (req: Request, res: Response) => {
  //     const publicAddress = req.headers.authorization;
  //     if (publicAddress) {
  //       const card = new CardHandler(mongodbClient, publicAddress);
  //       card.getBalance();
  //     } else {
  //       new ErrorHandler(res, 401, "You are not authenticated").send();
  //     }
  //   });

  router.post("/cards/fund", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization || "";

    new ProfileHandler(mongodbClient, publicAddress)
      .validatePublicAddress()
      .then(async (result) => {
        if (result) {
          const { amount } = req.body;

          const payment = new SolanaPay({ amount: new BigNumber(amount) });
          const url = payment.generateUrl();
          const details = payment.getDetails();

          console.log(details);

          const records = new SolanaPayRecord(mongodbClient, publicAddress);
          const record = await records.add(details, url);

          console.log("record", record);

          if (url && record) {
            await payment.simulate();
            new ResponseHandler(
              res,
              true,
              "Payment initialized successfully",
              record
            ).send();
          } else {
            new ErrorHandler(
              res,
              500,
              "Payment could not be initialized"
            ).send();
          }
        } else {
          unAuthedError(res);
        }
      });
  });

  router.get("/cards/fund/status", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization || "";
    new ProfileHandler(mongodbClient, publicAddress)
      .validatePublicAddress()
      .then(async (result) => {
        if (result) {
          if (req.query.id) {
            const id: number = parseInt(req.query.id.toString());

            const records = new SolanaPayRecord(mongodbClient, publicAddress);
            const record = await records.getEntry(id);

            if (record && req.query.reference) {
              const payment = new SolanaPay(record.details);
              const data = await payment.confirmPayment(
                req.query.reference.toString()
              );

              if (data?.status) {
                records.updateStatus(id, "successful");

                const card = new CardHandler(mongodbClient, publicAddress);
                await card.fundCard(record.details.amount);

                new ResponseHandler(
                  res,
                  true,
                  data.message,
                  await records.getEntry(id)
                ).send();
              } else if (data?.signatureInfo == null) {
                new ResponseHandler(res, true, data?.message, record).send();
              } else {
                new ErrorHandler(res, 400, data.message).send();
              }

              // Continue here return response.
            } else {
              new ErrorHandler(
                res,
                500,
                "Payment record could not be found"
              ).send();
            }
          } else {
            new ErrorHandler(res, 400, "The payment 'id' is invalid").send();
          }
        } else {
          unAuthedError(res);
        }
      });
  });

  router.get("/cards/fund", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization || "";

    const amount = parseFloat(req.query.amount?.toString() || "1");

    const card = new CardHandler(mongodbClient, publicAddress);
    card.fundCard(new BigNumber(amount)).then((result) => {
      if (result) {
        new ResponseHandler(res, true, "Done!", {}).send();
      } else {
        new ErrorHandler(res, 500, "Not Done!").send();
      }
    });
  });

  return router;
}
