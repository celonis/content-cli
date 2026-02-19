import axios, { AxiosInstance } from "axios";
import { HttpsProxyAgent } from "hpagent";

export class AxiosInitializer {
  public static initializeAxios(): AxiosInstance {
    const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;

    if (httpsProxy) {
      const httpsAgent = new HttpsProxyAgent({
        proxy: httpsProxy,
      });

      return axios.create({
        httpsAgent,
        proxy: false,
      });
    } else {
      return axios.create();
    }
  }
}
