import dotenv from 'dotenv'
import { AtpAgent } from '@atproto/api'
import config from './config.json' assert { type: 'json' }

dotenv.config({ path: '/home/finn/projects/roblox-devforum-news/.env' })

const now = new Date()

const credentials = {
    identifier: process.env.identifier,
    password: process.env.password
}

const webhookUrl = process.env.webhookUrl

const agent = new AtpAgent({ service: "https://bsky.social" })
await agent.login(credentials)

const getUtf8Length = (str) => new TextEncoder().encode(str).length

async function send(post, color) {
    const title = post.title
    const url = `https://devforum.roblox.com/t/${post.slug}/${post.id}`

    const response = await fetch(`https://devforum.roblox.com/t/${post.id}/posts.json`)
    const data = await response.json()
    const postData = data.post_stream.posts[0]

    let description = postData.cooked.replace(/<[^>]*>/g, '')
    const discordDescription = description.slice(0, 512) + '...'

    const wrapperlength = title.length + '\n'.length + '\n#roblox #robloxdev'.length
    const maxLength = 300 - wrapperlength

    if (description.length > maxLength) {
        description = description.slice(0, maxLength - 3) + '...'
    }

    const text = title + '\n' + description + '\n#roblox #robloxdev'
    const utf8Length = getUtf8Length(text)

    const position0 = { start: utf8Length - 18, end: utf8Length - 11 }
    const position1 = { start: utf8Length - 10, end: utf8Length }

    const body = JSON.stringify({
        content: `<@&${config.discordRoleId}>`,
        embeds: [{
            title: title,
            description: discordDescription,
            url: url,
            color: color,
            author: {
                name: postData.username
            },
            timestamp: postData.created_at
        }],
        attachments: []
    })

    fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: body
    })

    agent.post({
        text: text,
        facets: [
            {
                index: {
                    byteStart: 0,
                    byteEnd: title.length
                },
                features: [{
                    $type: 'app.bsky.richtext.facet#link',
                    uri: url
                }]
            },
            {
                index: {
                    byteStart: position0.start,
                    byteEnd: position0.end
                },
                features: [{
                    $type: 'app.bsky.richtext.facet#tag',
                    tag: 'roblox'
                }]
            },
            {
                index: {
                    byteStart: position1.start,
                    byteEnd: position1.end
                },
                features: [{
                    $type: 'app.bsky.richtext.facet#tag',
                    tag: 'robloxdev'
                }]
            }
        ]
    })
}

async function update(url, color) {
    try {
        const response = await fetch(url)
        const data = await response.json()
        const posts = data.topic_list.topics

        posts.forEach((post) => {
            const created = new Date(post.created_at)
            const difference = Math.floor(now - created)

            if (difference < config.interval) {
                send(post, color)
            }
        })
    } catch (error) {
        console.error(error)
    }
}

config.categories.forEach(({ name, id, color }) => update(`https://devforum.roblox.com/c/updates/${name}/${id}/l/latest.json`, color))

console.log(new Date(), 'executed')