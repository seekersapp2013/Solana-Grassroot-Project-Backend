import express, { Request, Response } from "express";

interface ServerResponse {
    status: boolean;
    message: string;
    data: object;
}

export class ResponseHandler {
  private status;
  private message;
  private details;
  private res;

  constructor(
    res: Response,
    status: boolean = false,
    message: string = "",
    data: any = null
  ) {
    this.res = res;
    this.status = status;
    this.message = message;
    this.details = data;
  }

  public setStatus(status: boolean): void {
    this.status = status;
  }

  public setMessage(message: string): void {
    this.message = message;
  }

  public setData(data: any): void {
    this.details = data;
  }

  public addInputError(parameter: string, message: string): void {
    this.details.push({ parameter, message });
  }

  public getInputErrorsLength(): number {
    return this.details.length
  }

  get data(): object {
    return {
      status: this.status,
      message: this.message,
      data: this.details ? this.details : null,
    };
  }

  public send() {
    return this.res.send(this.data);
  }
}