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

export function walletRoutes(mongodbClient: MongoClient) {
  const router = express.Router();
  const database: Db = mongodbClient.db("accounts");
  const wallets: Collection = database.collection("wallets");

  const unAuthedError = (res: Response) =>
    new ErrorHandler(
      res,
      401,
      "The public address provided could not be validated."
    ).send();

  router.get("/wallet", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization;
    if (publicAddress) {
      const wallet = new WalletHandler(mongodbClient, publicAddress);
      wallet.getWallet().then((result) => {
        if (result) {
          new ResponseHandler(res, true, "Query successful", result).send();
        } else {
          new ErrorHandler(
            res,
            500,
            "Could not get wallet information."
          ).send();
        }
      });
    } else {
      unAuthedError(res);
    }
  });

  //   router.get("/wallet/balance", (req: Request, res: Response) => {
  //     const publicAddress = req.headers.authorization;
  //     if (publicAddress) {
  //       const wallet = new WalletHandler(mongodbClient, publicAddress);
  //       wallet.getBalance();
  //     } else {
  //       new ErrorHandler(res, 401, "You are not authenticated").send();
  //     }
  //   });

  router.post("/wallet/fund", (req: Request, res: Response) => {
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

  router.get("/wallet/fund/status", (req: Request, res: Response) => {
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

                const wallet = new WalletHandler(mongodbClient, publicAddress);
                await wallet.fundWallet(record.details.amount);

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

  router.get("/wallet/fund", (req: Request, res: Response) => {
    const publicAddress = req.headers.authorization || "";

    const amount = parseFloat(req.query.amount?.toString() || "1");

    const wallet = new WalletHandler(mongodbClient, publicAddress);
    wallet.fundWallet(new BigNumber(amount)).then((result) => {
      if (result) {
        new ResponseHandler(res, true, "Done!", {}).send();
      } else {
        new ErrorHandler(res, 500, "Not Done!").send();
      }
    });
  });

  return router;
}
