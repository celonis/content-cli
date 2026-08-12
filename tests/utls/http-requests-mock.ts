import { AxiosInstance } from "axios";
import {Readable} from "stream";
import { AxiosInitializer } from "../../src/core/http/axios-initializer";

const mockedAxiosInstance = {} as AxiosInstance;

const CUI_PDF_COVER_PATH = "/api/team/cui-settings/cui-pdf-cover";

const mockedGetResponseByUrl = new Map<string, any>();
const mockedGetStatusByUrl = new Map<string, number>();
const mockedGetErrorByUrl = new Map<string, { status: number; data: any }>();
const mockedPostResponseByUrl = new Map<string, any>();
const mockedPostErrorByUrl = new Map<string, { status: number; data: any }>();
const mockedPostRequestBodyByUrl = new Map<string, any>();
const mockedPutErrorByUrl = new Map<string, { status: number; data: any }>();
const mockedDeleteResponseByUrl = new Map<string, any>();

const mockAxios = () : void => {
    AxiosInitializer.initializeAxios = jest.fn().mockReturnValue(mockedAxiosInstance);

    mockedAxiosInstance.get = jest.fn();
    mockedAxiosInstance.post = jest.fn();
    mockedAxiosInstance.put = jest.fn();
    mockedAxiosInstance.delete = jest.fn();

    (mockedAxiosInstance.get as jest.Mock).mockImplementation((requestUrl: string) => {
        if (mockedGetErrorByUrl.has(requestUrl)) {
            const { status, data } = mockedGetErrorByUrl.get(requestUrl)!;
            return Promise.reject({ response: { status, data } });
        }
        if (mockedGetResponseByUrl.has(requestUrl)) {
            const data = mockedGetResponseByUrl.get(requestUrl);
            const status = mockedGetStatusByUrl.get(requestUrl) ?? 200;

            if (data instanceof Buffer) {
                const readableStream = new Readable();
                readableStream.push(data)
                readableStream.push(null);
                return Promise.resolve({
                    status: 200,
                    data: readableStream,
                });
            } else {
                return Promise.resolve({ status, data });
            }
        }
        // CUI marking is probed on every user-facing write. Unless a test opts in,
        // answer 403 so the CLI keeps the original filename.
        if (requestUrl.endsWith(CUI_PDF_COVER_PATH)) {
            return Promise.resolve({ status: 403, data: "" });
        }
        fail("API call not mocked.")
    });

    (mockedAxiosInstance.post as jest.Mock).mockImplementation((requestUrl: string, data: any) => {
        if (mockedPostErrorByUrl.has(requestUrl)) {
            const { status, data: errorData } = mockedPostErrorByUrl.get(requestUrl)!;
            return Promise.reject({ response: { status, data: errorData } });
        }
        if (mockedPostResponseByUrl.has(requestUrl)) {
            const response = { data: mockedPostResponseByUrl.get(requestUrl) };
            mockedPostRequestBodyByUrl.set(requestUrl, data);

            return Promise.resolve(response);
        }
        fail("API call not mocked.")
    });

    (mockedAxiosInstance.put as jest.Mock).mockImplementation((requestUrl: string, data: any) => {
        if (mockedPutErrorByUrl.has(requestUrl)) {
            const { status, data: errorData } = mockedPutErrorByUrl.get(requestUrl)!;
            return Promise.reject({ response: { status, data: errorData } });
        }
        if (mockedPostResponseByUrl.has(requestUrl)) {
            const response = { data: mockedPostResponseByUrl.get(requestUrl) };
            mockedPostRequestBodyByUrl.set(requestUrl, data);

            return Promise.resolve(response);
        }
        fail("API call not mocked.")
    });
}

const mockAxiosGet = (url: string, responseData: any) => {
    mockedGetResponseByUrl.set(url, responseData);
    mockedGetStatusByUrl.delete(url);
    mockedGetErrorByUrl.delete(url);
};

const mockAxiosGetWithStatus = (url: string, status: number, responseData: any) => {
    mockedGetResponseByUrl.set(url, responseData);
    mockedGetStatusByUrl.set(url, status);
    mockedGetErrorByUrl.delete(url);
};

const mockAxiosGetError = (url: string, status: number, data: any) => {
    mockedGetErrorByUrl.set(url, { status, data });
    mockedGetResponseByUrl.delete(url);
};

const mockAxiosPost = (url: string, responseData: any) => {
    mockedPostResponseByUrl.set(url, responseData);
    mockedPostErrorByUrl.delete(url);
};

const mockAxiosPostError = (url: string, status: number, data: any) => {
    mockedPostErrorByUrl.set(url, { status, data });
    mockedPostResponseByUrl.delete(url);
};

const mockAxiosPut = (url: string, responseData: any) => {
    mockedPostResponseByUrl.set(url, responseData);
    mockedPutErrorByUrl.delete(url);
};

const mockAxiosPutError = (url: string, status: number, data: any) => {
    mockedPutErrorByUrl.set(url, { status, data });
    mockedPostResponseByUrl.delete(url);
};

const mockAxiosDelete = (url: string) => {
    mockedDeleteResponseByUrl.set(url, undefined);
    (mockedAxiosInstance.delete as jest.Mock).mockImplementation((requestUrl: string) => {
        if (mockedDeleteResponseByUrl.has(requestUrl)) {
            return Promise.resolve({ data: undefined, status: 204 });
        } else {
            fail("API call not mocked.")
        }
    })
}

afterEach(() => {
    mockedGetResponseByUrl.clear();
    mockedGetStatusByUrl.clear();
    mockedGetErrorByUrl.clear();
    mockedPostResponseByUrl.clear();
    mockedPostErrorByUrl.clear();
    mockedPostRequestBodyByUrl.clear();
    mockedPutErrorByUrl.clear();
    mockedDeleteResponseByUrl.clear();
})

export {
    mockedAxiosInstance,
    mockAxios,
    mockAxiosGet,
    mockAxiosGetWithStatus,
    mockAxiosGetError,
    mockAxiosPost,
    mockAxiosPostError,
    mockAxiosPut,
    mockAxiosPutError,
    mockAxiosDelete,
    mockedPostRequestBodyByUrl
};
