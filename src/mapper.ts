import { OpenAI } from "openai"

export async function map(input: any, outputFormat: any) {

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a helpful assistant that maps input to output format.`
            },
            {
                role: "user",
                content: `Input: ${JSON.stringify(input)}
                Output Format: ${JSON.stringify(outputFormat)}`
            }
        ],
        response_format: { type: "json_object" }
    })

    const output = JSON.parse(response.choices[0].message.content || "{}")
    return output
}
