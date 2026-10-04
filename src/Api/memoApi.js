import { getRequestWithOutBody, postRequestWithBodyAndToken } from "./fetch";
import { baseURl } from "../Config/systemConfig";

export const getMemoAcknowledgements = async ({ memoId, token, signal }) => {
  if (!memoId) throw new Error("memoId is required");
  if (!token) throw new Error("token is required");

  return await getRequestWithOutBody(
    `${baseURl}memo/${memoId}/acknowledgements`,
    token,
    { signal },
  );
};

export const acknowledgeMemo = async ({ memoId, token }) => {
  if (!memoId) throw new Error("memoId is required");
  if (!token) throw new Error("token is required");

  // API requires no payload; our helper expects a body
  return await postRequestWithBodyAndToken(
    `${baseURl}memo/${memoId}/acknowledge`,
    token,
    {},
  );
};

