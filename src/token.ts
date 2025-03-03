import axios from "axios"
import { prisma } from "./prisma"
import { readYamlFile } from "./yaml"

// Refresh token if it's expired
export const getAccessToken = async (toolName: string, ownerId: string) => {


    const tool = await prisma.tool.findFirst({
        where: { name: toolName, ownerId: ownerId }
    })

    if (!tool) {
        throw new Error("Tool not found")
    }

    const toolsFile = readYamlFile("tools.yml")
    const toolData = toolsFile.tools.find((tool: any) => tool.name === toolName)


    if (tool.refreshToken && tool.secretExpiresAt && tool.secretExpiresAt < new Date()) {
        const response = await axios({
            method: "POST",
            url: toolData.auth_info.token_url,
            data: {
                grant_type: "refresh_token",
                refresh_token: tool.refreshToken,
                client_id: toolData.auth_info.client_id,
                client_secret: toolData.auth_info.client_secret
            }
        })

        tool.secret = response.data.access_token
        tool.secretExpiresAt = new Date(new Date().getTime() + response.data.expires_in * 1000)

        await prisma.tool.update({
            where: {
                id: tool.id
            },
            data: tool
        })
    }

    return tool.secret

}
