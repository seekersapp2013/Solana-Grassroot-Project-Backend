import { Collection, Db, MongoClient } from "mongodb";

interface Profile {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  dob: string;
  bvn: string;
  ssn: string;
  photo: string;
}

export default class ProfileHandler {
  private publicAddress: string;
  private database: Db;
  private collection: Collection;

  constructor(mongodbClient: MongoClient, publicAddress: string) {
    this.database = mongodbClient.db("solana-grassroot-project");
    this.collection = this.database.collection("profiles");

    this.publicAddress = publicAddress;
  }

  async createProfile(doc: Profile): Promise<boolean> {
    const result = await this.collection.insertOne({
      publicAddress: this.publicAddress,
      ...doc,
    });

    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async validatePublicAddress(): Promise<boolean> {
    const query = { publicAddress: this.publicAddress };
    const result = await this.collection.findOne(query);
    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async getProfile(): Promise<boolean | Profile> {
    const query = { publicAddress: this.publicAddress };

    const result = await this.collection.findOne(query);
    if (result) {
      const { email, phone, firstName, lastName, dob, bvn, ssn, photo } =
        result;

      return {
        email,
        phone,
        firstName,
        lastName,
        dob,
        bvn,
        ssn,
        photo,
      };
    } else {
      return false;
    }
  }
}
