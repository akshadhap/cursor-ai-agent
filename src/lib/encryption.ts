import { KeyManagementServiceClient } from "@google-cloud/kms";
import Cryptr from "cryptr";

const encryptionKey = process.env.ENCRYPTION_KEY;
const keyName = process.env.KMS_KEY_NAME;

// Use KMS if KMS_KEY_NAME is available, otherwise fall back to Cryptr
const kms = keyName ? new KeyManagementServiceClient() : null;
const cryptr = !keyName && encryptionKey ? new Cryptr(encryptionKey) : null;

export async function encrypt(text: string): Promise<string> {
  // Use KMS if available
  if (kms && keyName) {
    const [response] = await kms.encrypt({
      name: keyName,
      plaintext: Buffer.from(text),
    });

    return response.ciphertext!.toString("base64");
  }

  // Fall back to Cryptr
  if (cryptr) {
    return cryptr.encrypt(text);
  }

  throw new Error("Neither KMS_KEY_NAME nor ENCRYPTION_KEY environment variable is set");
}

export async function decrypt(ciphertext: string): Promise<string> {
  // Use KMS if available
  if (kms && keyName) {
    const [response] = await kms.decrypt({
      name: keyName,
      ciphertext: Buffer.from(ciphertext, "base64"),
    });

    return response.plaintext!.toString();
  }

  // Fall back to Cryptr
  if (cryptr) {
    return cryptr.decrypt(ciphertext);
  }

  throw new Error("Neither KMS_KEY_NAME nor ENCRYPTION_KEY environment variable is set");
}