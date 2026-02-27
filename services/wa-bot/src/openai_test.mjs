import OpenAI from "openai";

async function run() {
  const k = process.env.OPENAI_API_KEY;

  const client = new OpenAI({
    apiKey: k,
    project: "proj_njatvsuAFF2E4a4QO4lQC586", // 👈 PASTE YOUR PROJECT ID HERE
  });

  const res = await client.responses.create({
    model: "gpt-4o-mini",
    input: "Reply with exactly: OK",
    max_output_tokens: 16,
  });

  console.log(res.output_text);
}

run().catch((err) => {
  console.error("ERROR:", err.message);
  if (err.error) console.error(err.error);
});
