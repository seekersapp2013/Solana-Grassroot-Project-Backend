"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
class ErrorHandler {
    constructor(res, code = 400, message = "An error occurred", details = []) {
        this.res = res;
        this.code = code;
        this.message = message;
        this.details = details;
    }
    setErrorCode(code) {
        this.code = code;
    }
    setMessage(message) {
        this.message = message;
    }
    addInputError(parameter, message) {
        this.details.push({ parameter, message });
    }
    getInputErrorsLength() {
        return this.details.length;
    }
    get data() {
        return {
            status: false,
            error: true,
            message: this.message,
            details: this.details ? this.details : null,
        };
    }
    get errorCode() {
        return this.code;
    }
    send() {
        return this.res.status(this.errorCode).send(this.data);
    }
}
exports.ErrorHandler = ErrorHandler;
