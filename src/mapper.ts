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

export function mapData(inputData: any, mappingTemplate: any): any {
    // Helper function to get value from path (e.g., "input.data.title")
    function getValueFromPath(data: any, path: string): any {
        if (path === "input") return data
        const parts = path.split('.')
        if (parts[0] !== "input") return path // If not a path, return as is
        
        let current = data
        for (let i = 1; i < parts.length; i++) {
            if (current === undefined || current === null) return undefined
            current = current[parts[i]]
        }
        return current
    }

    // Main mapping function
    function applyMapping(data: any, template: any): any {
        // Handle primitive types
        if (typeof template !== 'object' || template === null) {
            return template
        }

        // Handle arrays
        if (Array.isArray(template)) {
            return template.map(item => applyMapping(data, item))
        }

        // Handle template reference
        if (template.template) {
            return getValueFromPath(data, template.template)
        }

        // Handle objects
        const result: any = {}
        for (const key in template) {
            if (key === 'type' || key === 'required') continue
            
            if (key === 'items' && template.type === 'array') {
                // Handle array mapping
                const sourceData = template.template ? 
                    getValueFromPath(data, template.template) : 
                    data
                
                if (Array.isArray(sourceData)) {
                    return sourceData.map(item => applyMapping(item, template.items))
                }
                return []
            } else if (key === 'properties') {
                // Handle nested object properties
                for (const propKey in template.properties) {
                    result[propKey] = applyMapping(data, template.properties[propKey])
                }
            } else {
                result[key] = applyMapping(data, template[key])
            }
        }
        return result
    }

    return applyMapping(inputData, mappingTemplate)
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
                    For Input Schema, Output Schema Give the JSON Template
                    Example:
                    ---
                    Input Schema
                    {
                        type: "array"
                        items: {
                            type: "object"
                            properties: {
                                title: "string",
                                description: "name of the person"
                            }
                        }
                    }

                    Output Schema
                    {
                        type: "object"
                        properties: {

                            data: {
                            type: "array"
                                items: {
                                    type: "object"
                                    properties: {
                                        name: "string",
                                        description: "the name of person"
                                    }
                                }
                            }
                        }
                    }

                    JSON Template
                    {
                        type: "object"
                        properties: {

                            data: {
                                type: "array"
                                items: {
                                type: "object"
                                template: "input" 
                                properties: {
                                        name: "string",
                                        template: "input.title"
                                        description: "the name of person"
                                    }
                                }
                            }
                        }
                    }


                    If the input and output schemas are reversed (Based on target schema)

                    {
                        type: "array"
                        items: {
                            type: "object"
                            template: "input.data"
                            properties: {
                                title: "string",
                                template: "input.name"
                                description: "name of the person"
                            }
                        }
                    }
                `
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
