import { OpenAI } from "openai"
import { prisma } from "./prisma"

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

export function mapData(inputData: any, mappingTemplate: any) {
    function applyMapping(data: any, template: any): any {
        // Handle array mapping
        if (template.type === 'array' && Array.isArray(data)) {
            return data.map(item => applyMapping(item, template.items))
        }
        
        // Handle object mapping
        if (template.type === 'object' && typeof data === 'object' && data !== null) {
            const result = {}
            for (const key in template.properties) {
                const sourceKey = template.properties[key].source || key
                const sourceValue = data[sourceKey]
                
                if (sourceValue !== undefined) {
                    result[key] = applyMapping(sourceValue, template.properties[key])
                } else if (template.properties[key].default !== undefined) {
                    result[key] = template.properties[key].default
                }
            }
            return result
        }
        
        // Handle primitive types
        if (template.transform) {
            switch (template.transform) {
                case 'toString':
                    return String(data)
                case 'toNumber':
                    return Number(data)
                case 'toBoolean':
                    return Boolean(data)
                default:
                    return data
            }
        }
        
        return data
    }

    try {
        return applyMapping(inputData, mappingTemplate)
    } catch (error) {
        throw new Error(`Error mapping data: ${error.message}`)
    }
}

export async function autoMap(inputData: any, targetSchema: any, useCache: boolean = true) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    // Compute input schema
    const inputSchema = await computeSchema(inputData)


    if (useCache) {
        const existingMapper = await prisma.mapCache.findFirst({
            where: {
                inputSchema: JSON.stringify(inputSchema),
                targetSchema: JSON.stringify(targetSchema)
            }
        })

        if (existingMapper) {
            console.log("Using cached mapper")
            console.log(existingMapper.mapper)
            return mapData(inputData, JSON.parse(existingMapper.mapper))
        }
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a helpful assistant that maps input to output format.`
            },
            {
                role: "user",
                content: `
                From the input, extract the data and map it to the output format
                Input Schema: ${JSON.stringify(inputData)}
                Output Schema: ${JSON.stringify(targetSchema)}
                Generate the data mapper (template) in JSON Schema
                `
            }
        ],
        response_format: { type: "json_object" }
    })

    const output = JSON.parse(response.choices[0].message.content || "{}")

    console.log(output)
    
    await prisma.mapCache.create({
        data: {
            inputSchema: JSON.stringify(inputSchema),
            targetSchema: JSON.stringify(targetSchema),
            mapper: JSON.stringify(output)
        }
    })
    
    return mapData(inputData, output)
}
