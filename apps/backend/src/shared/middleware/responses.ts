import { StatusCodes } from 'http-status-codes';

export interface ResponseOptions<T> {
    message?: string;
    data?: T;
}

function createResponse<T>(statusCode: number, dataOrOptions: T | ResponseOptions<T>) {
    // If it's a message/data options object
    if (
        dataOrOptions &&
        typeof dataOrOptions === 'object' &&
        ('message' in dataOrOptions || 'data' in dataOrOptions)
    ) {
        const { message, data } = dataOrOptions as ResponseOptions<T>;
        return {
            statusCode,
            body: {
                ...(message ? { message } : {}),
                ...(data ? (typeof data === 'object' ? data : { data }) : {}),
            },
        };
    }

    // Default: return the body as is
    return {
        statusCode,
        body: dataOrOptions,
    };
}

export const responses = {
    ok: <T>(dataOrOptions: T | ResponseOptions<T>) => createResponse(StatusCodes.OK, dataOrOptions),
    created: <T>(dataOrOptions: T | ResponseOptions<T>) => createResponse(StatusCodes.CREATED, dataOrOptions),
    noContent: () => ({ statusCode: StatusCodes.NO_CONTENT, body: {} }),
};
