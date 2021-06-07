import crypto from "crypto";

export default function checksum(
  data: string, 
  dataEncoding: crypto.Encoding = 'utf-8', 
  algo: string = 'md5', 
  digestEncoding: crypto.BinaryToTextEncoding = 'hex'
) {
  
  crypto
    .createHash(algo)
    .update(data, dataEncoding)
    .digest(digestEncoding);
}