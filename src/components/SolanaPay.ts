import {
  Cluster,
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  ConfirmedSignatureInfo,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  encodeURL,
  createQR,
  findTransactionSignature,
  FindTransactionSignatureError,
  validateTransactionSignature,
} from "@solana/pay";
import BigNumber from "bignumber.js";
import { SOLANA_WALLET } from "../app";
import { simulateWalletInteraction } from "./simulateWalletInteraction";

export interface SolanaPayInit {
  recipient: PublicKey;
  amount: BigNumber;
  reference: PublicKey;
  label: string;
  message: string;
  memo: string;
}

export class SolanaPay {
  // Variable to keep state of the payment status
  private paymentStatus: string = "";

  private connection: any;

  // private details;
  // private res;
  private recipient: PublicKey;
  private amount: BigNumber;
  private reference: PublicKey;
  private label: string;
  private message: string;
  private memo: string;
  // private splToken: PublicKey;

  private url: string = "";

  private signatureInfo: ConfirmedSignatureInfo | undefined;

  constructor(
    {
      amount = new BigNumber(1),
      reference = new Keypair().publicKey,
      label = "Solana Grassroot Project",
      message = "Solana Grassroot Project - Fund Wallet",
      memo = "",
    },
    environment: Cluster = "devnet",
    wallet: string = SOLANA_WALLET
  ) {
    // Connecting to devnet for this example
    console.log("1. ✅ Establish connection to the network");
    this.connection = new Connection(clusterApiUrl(environment), "confirmed");

    console.log("2. 🛍 Simulate a customer checkout \n");
    this.recipient = new PublicKey(wallet);
    this.amount = new BigNumber(amount); //new BigNumber(20);
    this.reference = reference;
    this.label = label;
    this.message = message;
    this.memo = memo;
    // this.splToken = new PublicKey(
    //   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    // );
  }

  generateUrl() {
    console.log("3. 💰 Create a payment request link \n");
    this.url = encodeURL({
      recipient: this.recipient,
      amount: this.amount,
      // splToken: this.splToken,
      reference: this.reference,
      label: this.label,
      message: this.message,
      memo: this.memo,
    });

    this.paymentStatus = "initialized";

    return this.url;
  }

  getDetails(): SolanaPayInit {
    return {
      recipient: this.recipient,
      amount: this.amount,
      reference: this.reference,
      label: this.label,
      message: this.message,
      memo: this.memo,
    };
  }

  async simulate() {
    console.log("4. 🔐 Simulate wallet interaction \n");
    await simulateWalletInteraction(this.connection, this.url);

    this.paymentStatus = "pending";
  }

  async confirmPayment(reference: string) {
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    this.reference = new PublicKey(reference);
    try {
      this.signatureInfo = await findTransactionSignature(
        this.connection,
        this.reference,
        undefined,
        "confirmed"
      );
      console.log(this.signatureInfo);
      // return this.signatureInfo;

      console.log("\n6. 🔗 Validate transaction \n");
      const amountInLamports = this.amount
        .times(LAMPORTS_PER_SOL)
        .integerValue(BigNumber.ROUND_FLOOR);

      try {
        await validateTransactionSignature(
          this.connection,
          this.signatureInfo.signature,
          this.recipient,
          amountInLamports,
          undefined,
          this.reference 
        );

        // Update payment status
        this.paymentStatus = "validated";

        console.log("✅ Payment validated");
        console.log("📦 Ship order to customer");

        return {
          status: true,
          message: "Payment successful",
          signatureInfo: this.signatureInfo,
        };
      } catch (error) {
        console.error("❌ Payment failed", error);
        
        return {
          status: false,
          message: "Payment failed",
          signatureInfo: this.signatureInfo,
        };
      }
    } catch (error: any) {
      console.log(error);
      if (!(error instanceof FindTransactionSignatureError)) {
        console.error(error);
        return {
          status: false,
          message: "Transaction not found",
          signatureInfo: null
        };
      }
    }
  }
}
