import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  const res = await client.responses.create({
    model: "gpt-4o-mini",
    input: "Reply with exactly: OK",
    max_output_tokens: 16,
  });

  console.log(res.output_text);
}

run().catch(err => {
  console.error("ERROR:", err.message);
  if (err.error) console.error(err.error);
});
