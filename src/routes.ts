import { Router } from "express"
import { validateRequest } from "zod-express-middleware"
import { z } from "zod"
import { prisma } from "./prisma"
import yaml from "js-yaml"
import fs from "fs"
import axios from "axios"

const router = Router()

// Helper to read YAML files
const readYamlFile = (filename: string) => {
    const fileContents = fs.readFileSync(filename, "utf8")
    return yaml.load(fileContents) as any
}

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
                client_secret: tool["auth_info"]["client_secret"],
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

            const existingTool = await prisma.tool.findFirst({
                where: {
                    name: name,
                    ownerId: res.locals.ownerId
                }
            })

            if (existingTool) {
                await prisma.tool.update({
                    where: { id: existingTool.id },
                    data: { secret: accessToken }
                })
            } else {
                await prisma.tool.create({
                    data: { name: name, secret: accessToken, authType: "OAUTH2", ownerId: res.locals.ownerId }
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
    validateRequest({
        body: z.any()
    }),
    async (req, res) => {
        try {
            const { name } = req.params
            const endpoints = readYamlFile("endpoints.yml")
            const endpoint = endpoints[name]

            if (!endpoint) {
                res.status(404).json({ error: "Endpoint not found" })
                return
            }

            // Validate input format
            const inputSchema = z.any() // This should be derived from endpoint.inputFormat
            const validatedInput = inputSchema.parse(req.body)

            // Get tool authentication
            const toolAuth = await prisma.tool.findFirstOrThrow({
                where: {
                    name: endpoint.tool,
                    ownerId: res.locals.ownerId
                }
            })

            if (!toolAuth) {
                res.status(401).json({ error: "Tool not authenticated" })
                return
            }

            // Execute the endpoint logic
            // This would typically involve calling the external tool"s API
            // using the stored authentication and mapping the response

            res.json({
                status: "success",
                // Add processed result here
            })
            return
        } catch (error) {
            res.status(500).json({ error: "Failed to process endpoint request" })
            return
        }
    }
)

export default router
