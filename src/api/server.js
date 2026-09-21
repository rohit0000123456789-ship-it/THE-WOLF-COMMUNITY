import express from "express";

const app = express();

const PORT = process.env.BOT_API_PORT || 3001;

app.use(express.json());

let discordClient = null;


/* =========================================
   CONNECT DISCORD CLIENT
========================================= */

export function setDiscordClient(client) {
    discordClient = client;
}


/* =========================================
   API HOME
========================================= */

app.get("/", (req, res) => {

    res.json({
        success: true,
        name: "The Wolf Bot API",
        status: "online",
        port: PORT,
        message: "🐺 Wolf Bot API is running"
    });

});


/* =========================================
   HEALTH
========================================= */

app.get("/api/health", (req, res) => {

    const botReady =
        discordClient?.isReady?.() === true;

    res.json({

        success: true,

        status: botReady
            ? "online"
            : "starting",

        bot: botReady
            ? "connected"
            : "not_ready",

        port: PORT,

        uptime:
            Math.floor(process.uptime()),

        timestamp:
            new Date().toISOString()

    });

});


/* =========================================
   BOT STATUS
========================================= */

app.get("/api/status", (req, res) => {

    if (!discordClient) {

        return res.json({

            success: true,

            status: "starting",

            ping: 0,

            guilds: 0,

            uptime:
                Math.floor(process.uptime())

        });

    }


    res.json({

        success: true,

        status:
            discordClient.isReady()
                ? "online"
                : "offline",

        ping:
            discordClient.ws?.ping ?? 0,

        guilds:
            discordClient.guilds?.cache?.size ?? 0,

        uptime:
            Math.floor(process.uptime()),

        bot:

            discordClient.user
                ? {
                    id:
                        discordClient.user.id,

                    username:
                        discordClient.user.username,

                    tag:
                        discordClient.user.tag
                }

                : null

    });

});


/* =========================================
   SERVER STATS
========================================= */

app.get("/api/stats", async (req, res) => {

    try {

        if (!discordClient) {

            return res.json({

                success: true,

                members: 0,

                openTickets: 0,

                applications: 0,

                actionsToday: 0,

                bansToday: 0,

                ticketsClosed: 0,

                staffOnline: 0,

                errors: 0

            });

        }


        let members = 0;

        let guild = null;


        /*
         * If GUILD_ID exists, use that server.
         */

        if (process.env.GUILD_ID) {

            guild =
                discordClient.guilds.cache.get(
                    process.env.GUILD_ID
                );

        }


        /*
         * Fallback to first available server.
         */

        if (!guild) {

            guild =
                discordClient.guilds.cache.first();

        }


        if (guild) {

            /*
             * Fetch members so dashboard
             * receives current member count.
             */

            try {

                await guild.members.fetch();

            } catch (error) {

                console.log(
                    "Member fetch warning:",
                    error.message
                );

            }


            members =
                guild.memberCount || 0;

        }


        res.json({

            success: true,

            members,

            openTickets: 0,

            applications: 0,

            actionsToday: 0,

            bansToday: 0,

            ticketsClosed: 0,

            staffOnline: 0,

            errors: 0

        });


    } catch (error) {

        console.error(
            "Stats API error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to load server statistics"

        });

    }

});


/* =========================================
   SERVER INFORMATION
========================================= */

app.get("/api/server", async (req, res) => {

    try {

        if (!discordClient) {

            return res.status(503).json({

                success: false,

                message:
                    "Discord bot is not ready"

            });

        }


        let guild =
            discordClient.guilds.cache.get(
                process.env.GUILD_ID
            );


        if (!guild) {

            guild =
                discordClient.guilds.cache.first();

        }


        if (!guild) {

            return res.status(404).json({

                success: false,

                message:
                    "No Discord server found"

            });

        }


        res.json({

            success: true,

            server: {

                id:
                    guild.id,

                name:
                    guild.name,

                members:
                    guild.memberCount,

                channels:
                    guild.channels.cache.size,

                roles:
                    guild.roles.cache.size,

                bots:
                    guild.members.cache.filter(
                        member =>
                            member.user.bot
                    ).size,

                boosts:
                    guild.premiumSubscriptionCount ?? 0,

                boostLevel:
                    guild.premiumTier ?? 0,

                icon:
                    guild.iconURL({
                        size: 256
                    })

            }

        });


    } catch (error) {

        console.error(
            "Server API error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to load server information"

        });

    }

});


/* =========================================
   MEMBERS
========================================= */

app.get("/api/members", async (req, res) => {

    try {

        if (!discordClient) {

            return res.status(503).json({

                success: false,

                message:
                    "Bot is not ready"

            });

        }


        let guild =
            discordClient.guilds.cache.get(
                process.env.GUILD_ID
            );


        if (!guild) {

            guild =
                discordClient.guilds.cache.first();

        }


        if (!guild) {

            return res.status(404).json({

                success: false,

                message:
                    "Guild not found"

            });

        }


        await guild.members.fetch();


        const members =
            guild.members.cache.map(
                member => ({

                    id:
                        member.user.id,

                    username:
                        member.user.username,

                    displayName:
                        member.displayName,

                    avatar:
                        member.user.displayAvatarURL({
                            size: 128
                        }),

                    bot:
                        member.user.bot,

                    joinedAt:
                        member.joinedAt,

                    roles:
                        member.roles.cache
                            .filter(
                                role =>
                                    role.id !== guild.id
                            )
                            .map(
                                role =>
                                    ({
                                        id:
                                            role.id,

                                        name:
                                            role.name
                                    })
                            )

                })
            );


        res.json({

            success: true,

            total:
                members.length,

            members

        });


    } catch (error) {

        console.error(
            "Members API error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to load members"

        });

    }

});


/* =========================================
   START API SERVER
========================================= */

export function startApiServer() {

    app.listen(
        PORT,
        "0.0.0.0",
        () => {

            console.log("");
            console.log(
                "======================================"
            );

            console.log(
                "🐺 THE WOLF BOT API"
            );

            console.log(
                "======================================"
            );

            console.log(
                `🌐 API: http://localhost:${PORT}`
            );

            console.log(
                `❤️ Health: http://localhost:${PORT}/api/health`
            );

            console.log(
                "🟢 API server is ONLINE"
            );

            console.log(
                "======================================"
            );

        }
    );

}