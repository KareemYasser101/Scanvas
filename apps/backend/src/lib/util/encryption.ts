import CryptoJS from "crypto-js";

export const generateEncryption = ( plainText = "", signature = "" ) => {
  const encryptedValue = CryptoJS.AES.encrypt(plainText, signature).toString();
  return encryptedValue;
};

export const generateDecryption = ( cipherText = "", signature = "" ) => {
  const decryptedValue = CryptoJS.AES.decrypt(cipherText, signature).toString(CryptoJS.enc.Utf8);
  return decryptedValue;
};
