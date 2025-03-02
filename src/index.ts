import express from "express"
import { config } from "dotenv"
import routes from "./routes"

config()

async function main() {
    const app = express()
    const port = process.env.PORT || 3000

    app.use("/api", routes)

    app.listen(port, () => {
        console.log(`Server is running on port http://localhost:${port}`)
    })
}

main().catch(err => console.log(err))
