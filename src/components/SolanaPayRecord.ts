import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Collection, Db, MongoClient } from "mongodb";
import { SolanaPayInit } from "./SolanaPay";

interface Record {
  id: number;
  publicAddress: string;
  details: SolanaPayInit;
  url: string;
  status: "initialized" | "successful" | "failed";
  completed: boolean;
  dateTime: Date;
}

export default class SolanaPayRecord {
  private publicAddress: string;
  private database: Db;
  private collection: Collection;

  constructor(mongodbClient: MongoClient, publicAddress: string) {
    this.database = mongodbClient.db("solana-grassroot-project");
    this.collection = this.database.collection("payments");

    this.publicAddress = publicAddress;
  }

  async add(details: SolanaPayInit, url: string): Promise<Record | boolean> {
    const entry: Record = {
      id: Date.now(),
      publicAddress: this.publicAddress,
      details,
      url,
      dateTime: new Date(),
      status: "initialized",
      completed: false,
    };

    const result = await this.collection.insertOne(entry);

    if (result) {
      console.log(entry);
      return entry;
    } else {
      return false;
    }
  }

  async getEntry(id: number): Promise<Record | false> {
    const query = { publicAddress: this.publicAddress, id };
    const result = await this.collection.findOne(query);
    if (result) {
      const { id, publicAddress, details, url, dateTime, status, completed } =
        result;

      let data: Record;

      data = { id, publicAddress, details, url, dateTime, status, completed };

      return data;
    } else {
      return false;
    }
  }

  async updateStatus(id: number, status: string): Promise<boolean> {
    const query = { publicAddress: this.publicAddress, id };
    const doc = { status };
    const result = await this.collection.updateOne(query, {$set:doc});

    if (result) {
      return true;
    } else {
      return false;
    }
  }
}
