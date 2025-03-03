import Router from "express"
import { z } from "zod"
import { validateRequest } from "zod-express-middleware"
import axios from "axios"
import { readYamlFile } from "./yaml"
import { prisma } from "./prisma"
import jsonata from "jsonata"

const router = Router()

router.post(
    `/api/webhooks/tools/:tool/events/:event/:owner`,
    validateRequest({
        params: z.object({
            tool: z.string(),
            event: z.string(),
            owner: z.string().optional()
        })
    }),
    async (req, res) => {
        try {
            const { tool, owner } = req.params

            const webhooksFile = await readYamlFile("webhooks.yml")
            const webhook = webhooksFile.webhooks((webhook: any) => webhook.name === tool)
            const event = webhook.events.find((event: any) => event.name === event)

            const payload = await jsonata(event.payload_json_format).evaluate(req.body)

            const ownerId = owner ? owner : payload.owner ? payload.owner : null

            if (!ownerId) {
                res.status(400).json({ message: "Owner not found" })
                return
            }

            const webhookId = await prisma.webhook.findFirstOrThrow({
                where: {
                    toolName: tool,
                    ownerId: ownerId
                }
            })

            if(webhookId.webhookId !== payload.webhook_id) {
                res.status(401).json({ message: "Webhook ID mismatch" })
                return
            }

            let outputFormat = req.body

            if (event.output_json_format) {
                outputFormat = await jsonata(event.output_json_format).evaluate(req.body)
            }

            // Forward the webhook to the tool
            await axios.post(`${webhooksFile.forward_to}/${ownerId}`, outputFormat, {
                headers: {
                    "Authorization": `Bearer ${process.env.ACCESS_TOKEN_SECRET}` // Avoid public api calls
                }
            })

            res.json({ message: "Webhook received" })
            return
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Internal server error" })
            return
        }
    })

export default router