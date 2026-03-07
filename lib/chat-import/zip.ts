import JSZip from "jszip";

export interface ExtractedZipTextFile {
  name: string;
  text: string;
}

export interface ExtractedZipContents {
  textFiles: ExtractedZipTextFile[];
  ignoredFileCount: number;
}

export async function extractTextFilesFromZip(
  buffer: ArrayBuffer | Uint8Array
): Promise<ExtractedZipContents> {
  const zip = await JSZip.loadAsync(buffer);
  const textFiles: ExtractedZipTextFile[] = [];
  let ignoredFileCount = 0;

  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir) {
        return;
      }

      if (/\.txt$/iu.test(entry.name)) {
        textFiles.push({
          name: entry.name,
          text: await entry.async("string"),
        });
        return;
      }

      ignoredFileCount += 1;
    })
  );

  textFiles.sort((left, right) => left.name.localeCompare(right.name));

  return {
    textFiles,
    ignoredFileCount,
  };
}

