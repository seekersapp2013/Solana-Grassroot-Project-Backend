import BigNumber from "bignumber.js";
import { Collection, Db, MongoClient } from "mongodb";

interface Wallet {
  publicAddress: string;
  balance: number;
  history: Array<WalletHistory>;
}

interface WalletHistory {
  action: string;
  balance: number;
  dateTime: Date;
}

export class WalletHandler {
  private publicAddress: string;
  private database: Db;
  private collection: Collection;

  constructor(mongodbClient: MongoClient, publicAddress: string) {
    this.database = mongodbClient.db("solana-grassroot-project");
    this.collection = this.database.collection("wallets");

    this.publicAddress = publicAddress;
  }

  async create() {
    const wallet: Wallet = {
      publicAddress: this.publicAddress,
      balance: 0,
      history: [{ action: "Creation", balance: 0, dateTime: new Date() }],
    };

    const result = await this.collection.insertOne(wallet);

    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async fundWallet(amount: BigNumber) {
    const query = { publicAddress: this.publicAddress };
    const wallet = await this.collection.findOne(query);

    let balance = wallet?.balance + amount.toNumber();

    const history = [...wallet?.history, { action: "credit", amount: amount.toNumber(), balance, dateTime: new Date() }];

    const doc = { balance, history };
    
    const result = await this.collection.updateOne(query, {$set:doc});

    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async getWallet(): Promise<boolean | object> {
    const query = { publicAddress: this.publicAddress };
    const result = await this.collection.findOne(query);
    if (result) {
      const { balance, history } = result;
      return { balance, history };
    } else {
      if (this.publicAddress) {
        await this.create();
        const result = await this.getWallet();
        return result;
      }
      return false;
    }
  }

  async getBalance(): Promise<boolean | object> {
    return {};
  }

  debitWallet(amount: number) {
    // const balance = this.balance - amount;
  }
}
