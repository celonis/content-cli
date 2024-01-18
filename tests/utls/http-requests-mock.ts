import axios from "axios";

const mockedResponseByUrl = new Map<string, any>();

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

afterEach(() => {
    mockedResponseByUrl.clear();
})

export {mockAxiosGet};