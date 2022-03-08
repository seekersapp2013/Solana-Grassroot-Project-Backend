import express, { Request, Response } from "express";

interface InputError {
    parameter: string,
    message: string
}

export class ErrorHandler {
  private code;
  private message;
  private details;
  private res;

  constructor(
    res: Response,
    code: number = 400,
    message: string = "An error occurred",
    details: Array<InputError> = []
  ) {
    this.res = res;
    this.code = code;
    this.message = message;
    this.details = details;
  }

  setErrorCode(code: number): void {
    this.code = code;
  }

  setMessage(message: string): void {
    this.message = message;
  }

  addInputError(parameter: string, message: string): void {
    this.details.push({ parameter, message });
  }

  get data(): object {
    return {
      status: false,
      error: true,
      message: this.message,
      details: this.details ? this.details : null,
    };
  }

  get errorCode(): number {
    return this.code;
  }

  send() {
    return this.res.status(this.errorCode).send(this.data);
  }
}
