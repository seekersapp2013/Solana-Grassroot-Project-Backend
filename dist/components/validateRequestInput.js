"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestInput = void 0;
const ErrorHandler_1 = require("./ErrorHandler");
function validateRequestInput(res, expectedParameters) {
    let error = new ErrorHandler_1.ErrorHandler(res);
    error.setErrorCode(400);
    expectedParameters.map(parameter => {
        const parameterName = parameter[0];
        const parameterValue = parameter[1];
        if (parameterValue === undefined) {
            error.addInputError(parameterName, parameterName + " is required for this action.");
        }
    });
    if (error.getInputErrorsLength() !== 0) {
        return error;
    }
    return;
}
exports.validateRequestInput = validateRequestInput;
