import axios from "axios";
import BigNumber from "bignumber.js";
import { request } from "https";
import { Collection, Db, MongoClient } from "mongodb";

interface Card {
  id: number;
  publicAddress: string;
  details: object;
  status: string;
  createdAt: Date;
}

interface CardHistory {
  action: string;
  balance: number;
  dateTime: Date;
}

export class CardHandler {
  private publicAddress: string;
  private database: Db;
  private collection: Collection;

  constructor(mongodbClient: MongoClient, publicAddress: string) {
    this.database = mongodbClient.db("solana-grassroot-project");
    this.collection = this.database.collection("cards");

    this.publicAddress = publicAddress;
  }

  async create(details: object) {
    let result;
    // const apiResponse = (
    //   await axios.post(
    //     "https://sandbox.wallets.africa/cards/create",
    //     { ...details, secretKey: process.env.WALLETS_AFRICA_SECRET_KEY },
    //     {
    //       headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${process.env.WALLETS_AFRICA_PUBLIC_KEY}`,
    //       },
    //     }
    //   )
    // ).data;

    try {
      const apiResult = await axios({
        method: "post",
        url: "https://sandbox.wallets.africa/cards/create",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WALLETS_AFRICA_PUBLIC_KEY}`,
        },
        data: { ...details, secretKey: process.env.WALLETS_AFRICA_SECRET_KEY },
      });

      const apiResponse = apiResult.data;

      if (apiResponse.response.responseCode == "200") {
        const card: Card = {
          id: Date.now(),
          publicAddress: this.publicAddress,
          details: apiResponse.data,
          status: "created",
          createdAt: new Date(),
        };

        const result = await this.collection.insertOne(card);

        if (result) {
          return card;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } catch (e) {
      console.log("Error request", e);
      return false;
    }
  }

  async fundCard(amount: BigNumber) {
    const query = { publicAddress: this.publicAddress };
    const card = await this.collection.findOne(query);

    let balance = card?.balance + amount.toNumber();

    const history = [
      ...card?.history,
      {
        action: "credit",
        amount: amount.toNumber(),
        balance,
        dateTime: new Date(),
      },
    ];

    const doc = { balance, history };

    const result = await this.collection.updateOne(query, { $set: doc });

    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async getCards(): Promise<boolean | object> {
    const query = { publicAddress: this.publicAddress };
    const result = await this.collection.find(query).toArray();
    if (result) {
      console.log(result);
      return result.map((data) => {
        const { id, details, status, createdAt } = data;
        return { id, details, status, createdAt };
      });
    } else {
      return false;
    }
  }

  async getCard(): Promise<boolean | object> {
    const query = { publicAddress: this.publicAddress };
    const result = await this.collection.findOne(query);
    if (result) {
      const { balance, history } = result;
      return { balance, history };
    } else {
      return false;
    }
  }

  async getBalance(): Promise<boolean | object> {
    return {};
  }

  debitCard(amount: number) {
    // const balance = this.balance - amount;
  }
}
