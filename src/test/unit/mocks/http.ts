/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ENV0_API_URL } from "../../../common";
import { Credentials } from "../../../types";

export const mockValidateCredentialsRequest = (auth: Credentials) => {
  const requestMock = (url: string, options: any) => {
    if (
      url === `https://${ENV0_API_URL}/organizations` &&
      options?.auth?.username === auth.keyId &&
      options?.auth?.password === auth.secret
    ) {
      return Promise.resolve({ status: 200 });
    }
    return Promise.reject(new Error("not found"));
  };
  axios.get = requestMock as any;
};
