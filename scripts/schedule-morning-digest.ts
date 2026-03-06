import { sendMorningDigest } from "@/lib/push/server";

async function main() {
  const result = await sendMorningDigest();
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
