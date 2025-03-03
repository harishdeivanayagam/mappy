import { OpenAI } from "openai"
import jsonata from "jsonata"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"

export function computeSchema(inputData: any) {
    function inferSchema(data: any) {
        if (Array.isArray(data)) {
            return {
                type: 'array',
                items: data.length > 0 ? inferSchema(data[0]) : {}
            }
        } else if (typeof data === 'object' && data !== null) {
            const properties = {}
            for (const key of Object.keys(data)) {
                properties[key] = inferSchema(data[key])
            }
            return {
                type: 'object',
                properties,
                required: Object.keys(properties)
            }
        } else {
            return { type: typeof data }
        }
    }
    return inferSchema(inputData)
}


export async function mapData(inputData: string, outputSchema: string) {
    const mapper = await jsonata(outputSchema).evaluate(inputData)
    return mapper
}


export async function generateMappings(inputData: any, targetSchema: any) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    // Compute input schema
    const inputSchema = await computeSchema(inputData)

    const response = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: `
                From the input and output JSON schema
                ---
                Input Schema: ${JSON.stringify(inputSchema)}
                Output Schema: ${JSON.stringify(targetSchema)}
                ---

                Generate suitable jsonata expression to map the input to the output schema
                `
            }
        ],
        response_format: zodResponseFormat(z.object({
            expression: z.string(),
            explanation: z.string()
        }), "mapping")
    })

    return response.choices[0].message.parsed
}
