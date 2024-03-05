import axios from "axios";
import {Readable} from "stream";

const mockedGetResponseByUrl = new Map<string, any>();
const mockedPostResponseByUrl = new Map<string, any>();
const mockedPostRequestBodyByUrl = new Map<string, any>();

const mockAxiosGet = (url: string, responseData: any) => {
    mockedGetResponseByUrl.set(url, responseData);
    (axios.get as jest.Mock).mockImplementation(requestUrl => {
        if (mockedGetResponseByUrl.has(requestUrl)) {
            const response = { data: mockedGetResponseByUrl.get(requestUrl) };

            if (response.data instanceof Buffer) {
                const readableStream = new Readable();
                readableStream.push(response.data)
                readableStream.push(null);
                return Promise.resolve({
                    status: 200,
                    data: readableStream,
                });
            } else {
                return Promise.resolve(response);
            }
        } else {
            fail("API call not mocked.")
        }
    });
};

const mockAxiosPost = (url: string, responseData: any) => {
    mockedPostResponseByUrl.set(url, responseData);

    (axios.post as jest.Mock).mockImplementation((requestUrl: string, data: any) => {
        if (mockedPostResponseByUrl.has(requestUrl)) {
            const response = { data: mockedPostResponseByUrl.get(requestUrl) };
            mockedPostRequestBodyByUrl.set(requestUrl, data);

            return Promise.resolve(response);
        } else {
            fail("API call not mocked.")
        }
    })
}

const mockAxiosPut = (url: string, responseData: any) => {
    mockedPostResponseByUrl.set(url, responseData);

    (axios.put as jest.Mock).mockImplementation((requestUrl: string, data: any) => {
        if (mockedPostResponseByUrl.has(requestUrl)) {
            const response = { data: mockedPostResponseByUrl.get(requestUrl) };
            mockedPostRequestBodyByUrl.set(requestUrl, data);

            return Promise.resolve(response);
        } else {
            fail("API call not mocked.")
        }
    })
}

afterEach(() => {
    mockedGetResponseByUrl.clear();
    mockedPostResponseByUrl.clear();
    mockedPostRequestBodyByUrl.clear();
})

export {
    mockAxiosGet,
    mockAxiosPost,
    mockAxiosPut,
    mockedPostRequestBodyByUrl
};
