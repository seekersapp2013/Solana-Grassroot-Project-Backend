import { Response } from "express";
import { ErrorHandler } from "./components/ErrorHandler";

export const unAuthedError = (res: Response) =>
  new ErrorHandler(
    res,
    401,
    "The public address provided could not be validated."
  ).send();