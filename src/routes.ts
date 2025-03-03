import { Router } from "express"
import { validateRequest } from "zod-express-middleware"
import { z } from "zod"
import { prisma } from "./prisma"
import axios from "axios"
import { Tool } from "@prisma/client"
import { generateMappings, mapData } from "./mapper"
import { validate } from "jsonschema"
import { readYamlFile } from "./yaml"

const router = Router()

router.post(
    "/mappings",
    validateRequest({
        body: z.object({
            inputData: z.any(),
            outputSchema: z.any()
        })
    }),
    async (req, res) => {
        try {
            const { inputData, outputSchema } = req.body
            const mappings = await generateMappings(inputData, outputSchema)
            res.json(mappings)
            return
        } catch (err) {
            res.status(500).json({ error: "Failed to generate mappings" })
            return
        }
    }

)

router.get(
    "/tools",
    async (_, res) => {
        try {
            const toolsFile = readYamlFile("tools.yml")
            const toolsList = toolsFile.tools.map((tool: any) => ({ name: tool.name, auth: tool.auth, configured: false }))

            // For each tool, check if the ownerId has the tool from prisma
            for (const index in toolsList) {
                const existingTool = await prisma.tool.findFirst({
                    where: {
                        name: toolsList[index].name,
                        ownerId: res.locals.ownerId
                    }
                })

                if (existingTool) {
                    toolsList[index].configured = true
                }
            }

            res.json(toolsList)
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to read tools configuration" })
            return
        }
    }
)

router.get(
    "/tools/:name",
    validateRequest({
        params: z.object({
            name: z.string()
        })
    }),
    async (req, res) => {
        try {
            const { name } = req.params
            const tool = await prisma.tool.findFirst({
                where: {
                    name: name,
                    ownerId: res.locals.ownerId
                }
            })

            if (!tool) {
                res.status(404).json({ error: "Tool not found" })
                return
            }

            res.json(tool)
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to read tool" })
            return
        }
    }
)

router.delete(
    "/tools/:name",
    async (req, res) => {
        try {
            const { name } = req.params
            const existingTool = await prisma.tool.findFirst({
                where: {
                    name: name,
                    ownerId: res.locals.ownerId
                }
            })

            if (!existingTool) {
                res.status(404).json({ error: "Tool not found" })
                return
            }

            await prisma.tool.delete({ where: { id: existingTool.id } })
            res.json({ success: true })
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to delete tool" })
            return
        }
    }
)

router.get(
    "/tools/oauth/:name",
    async (req, res) => {
        try {
            const toolsFile = readYamlFile("tools.yml")
            const tool = toolsFile.tools.find((tool: any) => tool.name === req.params.name)

            if (!tool || tool.auth !== "oauth2") {
                res.status(404).json({ error: "Tool not found or not OAuth-based" })
                return
            }

            const params = new URLSearchParams({
                client_id: tool["auth_info"]["client_id"],
                response_type: 'code',
                scope: tool["auth_info"]["scopes"].join(' '),
                redirect_uri: tool["auth_info"]["redirect_uri"]
            })

            const authUrl = `${tool["auth_info"]["auth_url"]}?${params.toString()}`
            res.json({ url: authUrl })
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to generate auth URL" })
            return
        }
    }
)

router.post(
    "/tools/oauth/complete",
    validateRequest({
        body: z.object({
            code: z.string(),
            name: z.string()
        })
    }),
    async (req, res) => {
        try {
            const { code, name } = req.body
            const toolsFile = readYamlFile("tools.yml")
            const tool = toolsFile.tools.find((tool: any) => tool.name === name)

            if (!tool || tool.auth !== "oauth2") {
                res.status(404).json({ error: "Tool not found or not OAuth-based" })
                return
            }

            const params = new URLSearchParams({
                client_id: tool["auth_info"]["client_id"],
                client_secret: eval(tool["auth_info"]["client_secret"]),
                grant_type: "authorization_code",
                code,
                redirect_uri: tool["auth_info"]["redirect_uri"]
            })

            const response = await axios.post(tool["auth_info"]["token_url"], params.toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })

            const accessToken = response.data.access_token
            const refreshToken = response.data.refresh_token || null
            const expiresIn = response.data.expires_in || null

            const existingTool = await prisma.tool.findFirst({
                where: {
                    name: name,
                    ownerId: res.locals.ownerId
                }
            })

            if (existingTool) {
                await prisma.tool.update({
                    where: { id: existingTool.id },
                    data: {
                        secret: accessToken,
                        refreshToken: refreshToken,
                        secretExpiresAt: expiresIn
                    }
                })
            } else {
                await prisma.tool.create({
                    data: {
                        name: name,
                        secret: accessToken,
                        authType: "OAUTH2",
                        ownerId: res.locals.ownerId,
                        refreshToken: refreshToken,
                        secretExpiresAt: expiresIn ? new Date(new Date().getTime() + expiresIn * 1000) : null
                    }
                })
            }

            res.json({ success: true })
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to process OAuth callback" })
            return
        }
    }
)

router.post(
    "/tools/apikey",
    validateRequest({
        body: z.object({
            name: z.string(),
            apikey: z.string()
        })
    }),
    async (req, res) => {
        try {
            const { name, apikey } = req.body
            const toolsFile = readYamlFile("tools.yml")
            const tool = toolsFile.tools.find((tool: any) => tool.name === name)

            if (!tool || tool.auth !== "apikey") {
                res.status(404).json({ error: "Tool not found or not API key-based" })
                return
            }

            const existingTool = await prisma.tool.findFirst({
                where: {
                    name: name,
                    ownerId: res.locals.ownerId
                }
            })

            if (existingTool) {
                await prisma.tool.update({
                    where: {
                        id: existingTool.id
                    },
                    data: {
                        secret: apikey
                    }
                })
            } else {
                await prisma.tool.create({
                    data: {
                        name: name,
                        secret: apikey,
                        authType: "APIKEY",
                        ownerId: res.locals.ownerId
                    }
                })
            }

            res.json({ success: true })
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to save API key" })
            return
        }
    }
)

router.get(
    "/endpoints",
    async (_, res) => {
        try {
            const endpointsFile = readYamlFile("endpoints.yml")
            const endpointsList = endpointsFile.endpoints.map((endpoint: any) => ({
                name: endpoint.name,
                description: endpoint.description,
                inputFormat: endpoint.input_json_format,
                outputFormat: endpoint.output_json_format,
                availableTools: endpoint.tools.map((tool: any) => tool.name)
            }))
            res.json(endpointsList)
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to read endpoints configuration" })
            return
        }
    }
)

router.post(
    "/endpoints/:name",
    async (req, res) => {
        try {
            const { passthrough, manual_tool } = req.query

            const { name } = req.params
            const endpointsFile = readYamlFile("endpoints.yml")
            const endpoint = endpointsFile.endpoints.find((endpoint: any) => endpoint.name === name)

            if (!endpoint) {
                res.status(404).json({ error: "Endpoint not found" })
                return
            }

            if (endpoint.input_json_format && !validate(req.body, JSON.parse(endpoint.input_json_format)).valid) {
                res.status(400).json({ error: "Invalid input data" })
                return
            }

            const availableTools = endpoint.tools.map((tool: any) => tool.name)

            let tool: Tool | null = null

            if (manual_tool && availableTools.includes(manual_tool)) {
                tool = await prisma.tool.findFirst({
                    where: {
                        name: manual_tool as string,
                        ownerId: res.locals.ownerId
                    }
                })
            } else {
                for (const toolName of availableTools) {
                    tool = await prisma.tool.findFirst({
                        where: {
                            name: toolName,
                            ownerId: res.locals.ownerId
                        }
                    })
                    if (tool) {
                        break
                    }
                }
            }

            if (!tool) {
                res.status(404).json({ error: "No tool found" })
                return
            }

            // Find the tool in the endpoint <-> tool mapping [Ex: Hubspot -> User Hubspot]
            const endpointTool = endpoint.tools.find((et: any) => et.name === tool.name)
            console.log(endpointTool)

            // Set Token in headers
            const headersJSON = JSON.parse(endpointTool.headers.replace("{{ secret }}", tool.secret))
            console.log(headersJSON)

            // Map the body to the endpoint tool body
            const bodyJSON = endpointTool.body ? await mapData(req.body, endpointTool.body) : {}
            console.log(bodyJSON)

            // Map the query params to the endpoint tool query params
            const queryParamsJSON = endpointTool.query_params ? await mapData(req.body, endpointTool.query_params) : {}

            // Make the request
            const response = await axios({
                method: endpointTool.method.toLowerCase(),
                url: endpointTool.url,
                headers: headersJSON,
                data: bodyJSON,
                params: queryParamsJSON
            })

            if (passthrough && passthrough === "true") {
                res.json(response.data)
                return
            }

            // Map the response to the endpoint output format
            const outputJSON = await mapData(response.data, endpointTool.output_json_format)

            // Validate the output JSON
            if (endpoint.output_schema && !validate(outputJSON, JSON.parse(endpoint.output_schema)).valid) {
                res.status(500).json({ error: "Invalid output data returned from the endpoint" })
                return
            }

            res.json(outputJSON)
            return
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Failed to process endpoint request" })
            return
        }
    }
)

export default router
