/**
 * Base API implementation, which provides basic error handling for common problems.
 */

import {logger} from "../utils/logger";
import {HttpClient} from "./http-client";

export class ForbiddenError extends Error {
    constructor(message: string = "Access Forbidden") {
        super(message);
        this.name = "ForbiddenError";
        // Maintains proper stack trace in V8 environments (Node, Chrome)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ForbiddenError);
        }
    }
}

// Custom error for Server (5xx) responses.
export class ServerError extends Error {
    constructor(message: string = "Internal Server Error") {
        super(message);
        this.name = "ServerError";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ServerError);
        }
    }
}

// Custom error for Not Found (404) responses.
export class NotFoundError extends Error {
    constructor(message: string = "Resource Not Found") {
        super(message);
        this.name = "NotFoundError";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NotFoundError);
        }
    }
}

// Custom error for general network or unexpected issues.
export class NetworkError extends Error {
    constructor(message: string = "Network or unexpected error occurred") {
        super(message);
        this.name = "NetworkError";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NetworkError);
        }
    }
}

interface HttpError extends Error {
    status?: number; // HTTP status code (e.g., 404, 500)
    response?: any; // Optional: Include the full response body/details
}

export abstract class BaseApi {
    protected readonly httpClient: HttpClient;

    /**
     * Constructor for BaseApiService.
     * @param httpClient - An instance of HttpClient to be used for requests.
     */
    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Handles errors from HttpClient requests.
     * Logs the error and throws specific custom errors based on HTTP status codes.
     * Subclasses can override this for more specific error handling.
     * @param error - The error object caught from the HttpClient promise.
     * @returns Never, as this method always throws an error.
     */
    protected handleError(error: any): never {
        logger.debug("API Error:", error); // Basic logging

        // Check if it looks like an HTTP error with a status code
        if (error && typeof error.status === "number") {
            const httpError = error as HttpError;
            switch (httpError.status) {
                case 401:
                    // Handle Unauthorized (e.g., redirect to login)
                    // Depending on the app, might not throw, but trigger auth flow
                    // Example: throw new AuthenticationError('Authentication required');
                    throw new Error(`Unauthorized (401): ${httpError.message || "Authentication required"}`); // Placeholder
                case 403:
                    throw new ForbiddenError(`Forbidden (403): ${httpError.message || "Access denied"}`);
                case 404:
                    throw new NotFoundError(`Not Found (404): ${httpError.message || "Resource not found"}`);
                case 500:
                case 501:
                case 502:
                case 503:
                case 504:
                    throw new ServerError(`Server Error (${httpError.status}): ${httpError.message || "Server issue"}`);
                default:
                    // Handle other HTTP errors (e.g., 400 Bad Request)
                    throw new Error(
                        `HTTP Error (${httpError.status}): ${httpError.message || "An HTTP error occurred"}`
                    );
            }
        } else if (error instanceof Error) {
            // Handle non-HTTP errors (e.g., network issues, client-side errors)
            console.debug("Non-HTTP Error:", error.message);
            throw new NetworkError(`Network or client-side error: ${error.message}`);
        } else {
            // Handle cases where the caught object is not an Error instance
            console.debug("Unknown error structure:", error);
            throw new Error("An unknown error occurred");
        }
    }
}
