import JSZip from "jszip";

export interface ExtractedZipTextFile {
  name: string;
  text: string;
}

export interface ExtractedZipContents {
  textFiles: ExtractedZipTextFile[];
  ignoredFileCount: number;
}

export type ZipImportErrorCode = "INVALID_ZIP" | "ZIP_TEXT_READ_FAILED";

export class ZipImportError extends Error {
  code: ZipImportErrorCode;

  constructor(message: string, code: ZipImportErrorCode) {
    super(message);
    this.name = "ZipImportError";
    this.code = code;
  }
}

export async function extractTextFilesFromZip(
  buffer: ArrayBuffer | Uint8Array
): Promise<ExtractedZipContents> {
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  } catch {
    throw new ZipImportError(
      "We could not open that ZIP archive. Export the chat again and upload a fresh ZIP.",
      "INVALID_ZIP"
    );
  }

  const textFiles: ExtractedZipTextFile[] = [];
  let ignoredFileCount = 0;

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      continue;
    }

    if (!/\.txt$/iu.test(entry.name)) {
      ignoredFileCount += 1;
      continue;
    }

    try {
      textFiles.push({
        name: entry.name,
        text: await entry.async("string"),
      });
    } catch {
      throw new ZipImportError(
        "We could not read one of the text files inside that ZIP. Export the chat again and upload a fresh ZIP.",
        "ZIP_TEXT_READ_FAILED"
      );
    }
  }

  textFiles.sort((left, right) => left.name.localeCompare(right.name));

  return {
    textFiles,
    ignoredFileCount,
  };
}

