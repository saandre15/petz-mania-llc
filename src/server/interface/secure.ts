import { ParsedPath } from "path";

export interface SecureLocals {
  files?: FileLocal[];
}

interface FileLocal {
  filename: string;
  filecontent: Buffer;
  path: string;
}