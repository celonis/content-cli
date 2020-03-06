import { Profile } from "../interfaces/profile.interface";

const request = require("request");

export class HttpClientService {
    public async pushData(url, profile: Profile, body: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.post(url, this.makeOptions(profile, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async pullData(url, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(url, this.makeOptions(profile, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async updateData(url, profile: Profile, body: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.put(url, this.makeOptions(profile, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    private makeOptions(profile: Profile, body: any) {
        let options = {
            headers: {
                authorization: `Bearer ${profile.apiToken}`,
                "content-type": "application/json",
            },
        };

        return Object.assign(options, body);
    }

    private handleResponse(res, resolve, reject) {
        if (res.statusCode >= 400) {
            if (res.body) {
                reject(res.body);
            } else {
                reject("Backend responded with status code " + res.statusCode);
            }
        } else {
            let body = {};
            try {
                if (res.body) {
                    body = JSON.parse(res.body);
                }
            } catch (e) {
                reject("Something went wrong. Please check that you have the right url and api key.");
            }
            resolve(body);
        }
    }
}
