import { ErrorHandler } from "./ErrorHandler";
import { Response } from 'express';

export function validateRequestInput (res: Response, expectedParameters: Array<[string, string]>) : ErrorHandler | undefined {

    let error = new ErrorHandler(res);
    error.setErrorCode(400);

    expectedParameters.map(parameter => {
        const parameterName = parameter[0]
        const parameterValue = parameter[1]

        if (parameterValue === undefined) {
            error.addInputError(
                parameterName,
                parameterName + " is required for this action."
            )
        }
    })

    if (error.getInputErrorsLength() !== 0) {
        return error
    }
    return
}