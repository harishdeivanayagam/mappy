import { Router } from "express"
import { validateRequest } from "zod-express-middleware"
import { z } from "zod"

const router = Router()

router.get(
    "/tools",
    async (req, res) => {
        // Read from tools.yml
        // Return the list of tools
    }
)


router.get(
    "/tools/oauth/:name",
    async (req, res) => {
        // Read from tools.yml
        // Generate Auth URL
    }
)


router.get(
    "/tools/oauth/:name/callback",
    async (req, res) => {
        // Get the access token and save it to the database
    }
)

router.post(
    "/tools/apikey",
    validateRequest({
        body: z.object({
            name: z.string(),
            apiKey: z.string()
        })
    }),
    async (req, res) => {
        // Read from tools.yml
        // Save the api key to the database
    }
)


router.get(
    "/endpoints",
    async (req, res) => {
        // Read from endpoints.yml
        // Return the list of endpoints
    }
)


router.post(
    "/endpoints/:name",
    async (req, res) => {
        // Read from endpoints.yml

        
    }
)


export default router
