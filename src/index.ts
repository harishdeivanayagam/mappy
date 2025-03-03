import express from "express"
import { config } from "dotenv"
import routes from "./routes"
import webhooks from "./webhooks"

config()

async function main() {
    const app = express()
    const port = process.env.PORT || 3000

    app.use(express.json())

    app.get("/tools/oauth/:name/callback", (req, res) => {
        res.json({ code: req.query.code, name: req.params.name })
    })

    app.use("/api/webhooks", webhooks)

    // Auth Middleware
    app.use((req, res, next) => {
        const token = req.headers.authorization && req.headers.authorization.split(" ")[1]
        if (!token || token !== process.env.ACCESS_TOKEN_SECRET) {
            res.status(401).json({ message: "Unauthorized" })
            return
        }
        if (!req.headers["x-owner-id"]) {
            res.status(400).json({ message: "Owner ID is required" })
            return
        }
        res.locals.ownerId = req.headers["x-owner-id"]
        next()
    })

    app.use("/api", routes)

    app.listen(port, () => {
        console.log(`Server is running on port http://localhost:${port}`)
    })
}

main().catch(err => console.log(err))
