import axios from "axios";
import {Readable} from "stream";

const mockedResponseByUrl = new Map<string, any>();
const mockedPostRequestBodyByUrl = new Map<string, any>();

const mockAxiosGet = (url: string, responseData: any) => {
    mockedResponseByUrl.set(url, responseData);

    (axios.get as jest.Mock).mockImplementation(requestUrl => {
        if (mockedResponseByUrl.has(requestUrl)) {
            const response = { data: mockedResponseByUrl.get(requestUrl) };

            if (response.data instanceof Buffer) {
                const readableStream = new Readable();
                readableStream.push(response.data)
                readableStream.push(null);
                return Promise.resolve({
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
    mockedResponseByUrl.set(url, responseData);

    (axios.post as jest.Mock).mockImplementation((requestUrl: string, data: any) => {
        if (mockedResponseByUrl.has(requestUrl)) {
            const response = { data: mockedResponseByUrl.get(requestUrl) };
            mockedPostRequestBodyByUrl.set(requestUrl, data);

            return Promise.resolve(response);
        } else {
            fail("API call not mocked.")
        }
    })
}

afterEach(() => {
    mockedResponseByUrl.clear();
    mockedPostRequestBodyByUrl.clear();
})

export {mockAxiosGet, mockAxiosPost, mockedPostRequestBodyByUrl};