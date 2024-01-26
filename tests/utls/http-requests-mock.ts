import axios from "axios";

const mockedResponseByUrl = new Map<string, any>();
const mockedPostRequestBodyByUrl = new Map<string, any>();

const mockAxiosGet = (url: string, responseData: any) => {
    mockedResponseByUrl.set(url, responseData);

    (axios.get as jest.Mock).mockImplementation(requestUrl => {
        if (mockedResponseByUrl.has(requestUrl)) {
            return Promise.resolve({ data: mockedResponseByUrl.get(requestUrl) });
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
})

export {mockAxiosGet, mockAxiosPost, mockedPostRequestBodyByUrl};