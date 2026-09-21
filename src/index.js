// src/index.js

import "dotenv/config";

import express from "express";
import cors from "cors";

import {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";

// ============================================================
// ENV
// ============================================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const BOT_API_PORT =
    Number(process.env.BOT_API_PORT) || 3001;

if (!DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing in .env");
    process.exit(1);
}

if (!GUILD_ID) {
    console.error("❌ GUILD_ID is missing in .env");
    process.exit(1);
}

// ============================================================
// LOAD SYSTEM MODULES SAFELY
// ============================================================

async function loadSystem(path, name) {
    try {
        const module = await import(path);

        console.log(`✅ Loaded ${name}`);

        return module;
    } catch (error) {
        console.error(`❌ Failed to load ${name}:`, error);

        return {};
    }
}

const ticketSystem = await loadSystem(
    "./systems/ticketSystem.js",
    "Ticket System"
);

const applicationSystem = await loadSystem(
    "./systems/applicationSystem.js",
    "Application System"
);

const leaveSystem = await loadSystem(
    "./systems/leaveSystem.js",
    "Leave System"
);

const giveawaySystem = await loadSystem(
    "./systems/giveawaySystem.js",
    "Giveaway System"
);

const moderationSystem = await loadSystem(
    "./systems/moderationSystem.js",
    "Moderation System"
);

const verificationSystem = await loadSystem(
    "./systems/verificationVoice.js",
    "Verification Voice"
);

const activityStore = await loadSystem(
    "./data/activityStore.js",
    "Activity Store"
);

// ============================================================
// DISCORD CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============================================================
// EXPRESS API
// ============================================================

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// ============================================================
// LOCAL ACTIVITY FALLBACK
// ============================================================

const localActivities = [];

function addLocalActivity({
    type = "system",
    title = "System Activity",
    description = "",
    userId = null,
    username = null,
    icon = "📌",
    metadata = {}
}) {
    const activity = {
        id: `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

        type,
        title,
        description,
        userId,
        username,
        icon,
        metadata,

        timestamp:
            new Date().toISOString()
    };

    localActivities.unshift(activity);

    if (localActivities.length > 200) {
        localActivities.length = 200;
    }

    return activity;
}

function addActivity(data) {
    try {
        if (
            typeof activityStore.addActivity ===
            "function"
        ) {
            return activityStore.addActivity(data);
        }
    } catch (error) {
        console.error(
            "❌ Activity store error:",
            error
        );
    }

    return addLocalActivity(data);
}

function getActivities(limit = 50) {
    try {
        if (
            typeof activityStore.getActivities ===
            "function"
        ) {
            return activityStore.getActivities(limit);
        }
    } catch (error) {
        console.error(
            "❌ Failed to get activities:",
            error
        );
    }

    return localActivities.slice(
        0,
        Math.min(Number(limit) || 50, 200)
    );
}

// ============================================================
// DATA HELPERS
// ============================================================

function toArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value instanceof Map) {
        return [...value.values()];
    }

    if (!value) {
        return [];
    }

    return [];
}

function getTickets() {
    try {
        if (
            typeof ticketSystem.getTickets ===
            "function"
        ) {
            return toArray(
                ticketSystem.getTickets()
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get tickets:",
            error
        );
    }

    return [];
}

function getTicketStats() {
    try {
        if (
            typeof ticketSystem.getTicketStats ===
            "function"
        ) {
            return (
                ticketSystem.getTicketStats() || {}
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get ticket stats:",
            error
        );
    }

    const tickets = getTickets();

    return {
        total: tickets.length,

        open: tickets.filter(
            (ticket) =>
                ticket.status === "open"
        ).length,

        closed: tickets.filter(
            (ticket) =>
                ticket.status === "closed"
        ).length,

        claimed: tickets.filter(
            (ticket) =>
                Boolean(ticket.claimedBy)
        ).length
    };
}

function getApplications() {
    try {
        if (
            typeof applicationSystem.getApplications ===
            "function"
        ) {
            return toArray(
                applicationSystem.getApplications()
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get applications:",
            error
        );
    }

    return [];
}

function getLeaveApplications() {
    try {
        if (
            typeof leaveSystem.getLeaveApplications ===
            "function"
        ) {
            return toArray(
                leaveSystem.getLeaveApplications()
            );
        }

        if (
            typeof leaveSystem.getLeaves ===
            "function"
        ) {
            return toArray(
                leaveSystem.getLeaves()
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get leave applications:",
            error
        );
    }

    return [];
}

function getGiveaways() {
    try {
        if (
            typeof giveawaySystem.getGiveaways ===
            "function"
        ) {
            return toArray(
                giveawaySystem.getGiveaways()
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get giveaways:",
            error
        );
    }

    return [];
}

function getModerationCases() {
    try {
        if (
            typeof moderationSystem.getModerationCases ===
            "function"
        ) {
            return toArray(
                moderationSystem.getModerationCases()
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get moderation cases:",
            error
        );
    }

    return [];
}

// ============================================================
// GET MAIN GUILD
// ============================================================

function getMainGuild() {
    return client.guilds.cache.get(GUILD_ID);
}

// ============================================================
// API — HEALTH
// ============================================================

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        service: "The Wolf Bot API",
        botReady: client.isReady(),
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// API — STATUS
// ============================================================

app.get("/api/status", (req, res) => {
    const guild = getMainGuild();

    res.json({
        online: client.isReady(),

        status: client.isReady()
            ? "online"
            : "offline",

        bot: client.user
            ? {
                  id: client.user.id,
                  username: client.user.username,
                  tag: client.user.tag
              }
            : null,

        guild: guild
            ? {
                  id: guild.id,
                  name: guild.name,
                  memberCount:
                      guild.memberCount
              }
            : null,

        uptime:
            client.uptime || 0,

        uptimeSeconds:
            Math.floor(
                (client.uptime || 0) / 1000
            ),

        timestamp:
            new Date().toISOString()
    });
});

// ============================================================
// API — SERVER
// ============================================================

app.get("/api/server", (req, res) => {
    const guild = getMainGuild();

    if (!guild) {
        return res.status(404).json({
            error: "Guild not found"
        });
    }

    res.json({
        id: guild.id,
        name: guild.name,

        icon: guild.iconURL({
            size: 256
        }),

        memberCount:
            guild.memberCount,

        channelCount:
            guild.channels.cache.size,

        roleCount:
            guild.roles.cache.size,

        createdAt:
            guild.createdAt
                ? guild.createdAt.toISOString()
                : null
    });
});

// ============================================================
// API — MEMBERS
// ============================================================

app.get("/api/members", (req, res) => {
    const guild = getMainGuild();

    if (!guild) {
        return res.status(404).json({
            error: "Guild not found"
        });
    }

    const members =
        [...guild.members.cache.values()]
            .filter(
                (member) =>
                    !member.user.bot
            )
            .map((member) => ({
                id: member.id,

                username:
                    member.user.username,

                tag:
                    member.user.tag,

                displayName:
                    member.displayName,

                avatar:
                    member.user.displayAvatarURL({
                        size: 128
                    }),

                joinedAt:
                    member.joinedAt
                        ? member.joinedAt.toISOString()
                        : null,

                roles:
                    member.roles.cache
                        .filter(
                            (role) =>
                                role.id !==
                                guild.id
                        )
                        .map(
                            (role) => ({
                                id: role.id,
                                name: role.name
                            })
                        )
            }));

    res.json({
        total:
            members.length,

        members
    });
});

// ============================================================
// API — ACTIVITIES
// ============================================================

app.get("/api/activities", (req, res) => {
    const limit =
        Number(req.query.limit) || 20;

    res.json({
        activities:
            getActivities(limit)
    });
});

// ============================================================
// API — TICKETS
// ============================================================

app.get("/api/tickets", (req, res) => {
    res.json({
        tickets:
            getTickets(),

        stats:
            getTicketStats()
    });
});

// ============================================================
// API — APPLICATIONS
// ============================================================

app.get(
    "/api/applications",
    (req, res) => {
        res.json({
            applications:
                getApplications()
        });
    }
);

// ============================================================
// API — LEAVE
// ============================================================

app.get("/api/leave", (req, res) => {
    res.json({
        applications:
            getLeaveApplications()
    });
});

// ============================================================
// API — GIVEAWAYS
// ============================================================

app.get(
    "/api/giveaways",
    (req, res) => {
        res.json({
            giveaways:
                getGiveaways()
        });
    }
);

// ============================================================
// API — MODERATION
// ============================================================

app.get(
    "/api/moderation/cases",
    (req, res) => {
        res.json({
            cases:
                getModerationCases()
        });
    }
);

// ============================================================
// API — STATS
// ============================================================

app.get("/api/stats", (req, res) => {
    const guild = getMainGuild();

    const ticketStats =
        getTicketStats();

    const applications =
        getApplications();

    const leaveApplications =
        getLeaveApplications();

    const giveaways =
        getGiveaways();

    const moderationCases =
        getModerationCases();

    res.json({
        members:
            guild?.memberCount || 0,

        channels:
            guild?.channels.cache.size || 0,

        roles:
            guild?.roles.cache.size || 0,

        tickets:
            ticketStats,

        openTickets:
            ticketStats.open || 0,

        applications:
            applications.length,

        pendingApplications:
            applications.filter(
                (application) =>
                    application.status ===
                    "Pending"
            ).length,

        leaveApplications:
            leaveApplications.length,

        pendingLeaves:
            leaveApplications.filter(
                (leave) =>
                    leave.status ===
                    "Pending"
            ).length,

        giveaways:
            giveaways.length,

        moderationCases:
            moderationCases.length,

        staffOnline:
            guild
                ? guild.members.cache.filter(
                      (member) =>
                          !member.user.bot &&
                          (
                              member.permissions?.has(
                                  PermissionFlagsBits.Administrator
                              ) ||
                              member.roles.cache.some(
                                  (role) =>
                                      [
                                          "1525599169866109008",
                                          "1525869619196461076",
                                          "1525869695872532582",
                                          "1525869907495878756"
                                      ].includes(
                                          role.id
                                      )
                              )
                          )
                  ).size
                : 0,

        botOnline:
            client.isReady(),

        uptime:
            client.uptime || 0
    });
});

// ============================================================
// API — DASHBOARD COMBINED DATA
// ============================================================

app.get(
    "/api/dashboard",
    (req, res) => {
        const guild =
            getMainGuild();

        res.json({
            status: {
                online:
                    client.isReady(),

                uptime:
                    client.uptime || 0
            },

            server: guild
                ? {
                      id: guild.id,
                      name: guild.name,
                      memberCount:
                          guild.memberCount,
                      channelCount:
                          guild.channels.cache.size,
                      roleCount:
                          guild.roles.cache.size
                  }
                : null,

            stats: {
                tickets:
                    getTicketStats(),

                applications:
                    getApplications().length,

                leave:
                    getLeaveApplications().length,

                giveaways:
                    getGiveaways().length,

                moderation:
                    getModerationCases().length
            },

            activities:
                getActivities(20)
        });
    }
);

// ============================================================
// EXPRESS ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "❌ API Error:",
            error
        );

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({
            error:
                "Internal server error"
        });
    }
);

// ============================================================
// START API
// ============================================================

app.listen(
    BOT_API_PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🌐 Wolf Bot API running on port ${BOT_API_PORT}`
        );
    }
);

// ============================================================
// PANEL SETUP
// ============================================================

async function setupPanels() {
    console.log(
        "🔧 Checking Discord panels..."
    );

    try {
        if (
            typeof ticketSystem.ensureTicketPanel ===
            "function"
        ) {
            await ticketSystem.ensureTicketPanel(
                client
            );
        }
    } catch (error) {
        console.error(
            "❌ Ticket panel setup failed:",
            error
        );
    }

    try {
        if (
            typeof applicationSystem.ensureApplicationPanel ===
            "function"
        ) {
            await applicationSystem.ensureApplicationPanel(
                client
            );
        }
    } catch (error) {
        console.error(
            "❌ Application panel setup failed:",
            error
        );
    }

    try {
        if (
            typeof leaveSystem.ensureLeavePanel ===
            "function"
        ) {
            await leaveSystem.ensureLeavePanel(
                client
            );
        }
    } catch (error) {
        console.error(
            "❌ Leave panel setup failed:",
            error
        );
    }

    console.log(
        "✅ Discord panel check complete."
    );
}

// ============================================================
// SLASH COMMAND DEFINITIONS
// ============================================================

const commandDefinitions = [

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription(
            "Warn a member."
        )
        .addUserOption(
            (option) =>
                option
                    .setName("member")
                    .setDescription(
                        "Member to warn."
                    )
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("reason")
                    .setDescription(
                        "Reason for the warning."
                    )
                    .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription(
            "Timeout a member."
        )
        .addUserOption(
            (option) =>
                option
                    .setName("member")
                    .setDescription(
                        "Member to timeout."
                    )
                    .setRequired(true)
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("duration")
                    .setDescription(
                        "Duration in minutes."
                    )
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(40320)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("reason")
                    .setDescription(
                        "Reason for the timeout."
                    )
                    .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription(
            "Kick a member."
        )
        .addUserOption(
            (option) =>
                option
                    .setName("member")
                    .setDescription(
                        "Member to kick."
                    )
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("reason")
                    .setDescription(
                        "Reason for the kick."
                    )
                    .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription(
            "Ban a member."
        )
        .addUserOption(
            (option) =>
                option
                    .setName("member")
                    .setDescription(
                        "Member to ban."
                    )
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("reason")
                    .setDescription(
                        "Reason for the ban."
                    )
                    .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription(
            "Unban a user."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("user_id")
                    .setDescription(
                        "Discord user ID."
                    )
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("reason")
                    .setDescription(
                        "Reason for the unban."
                    )
                    .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription(
            "Delete recent messages."
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("amount")
                    .setDescription(
                        "Number of messages to delete."
                    )
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(100)
        ),

    // ========================================================
    // NEW: /giveaway
    // ========================================================

    new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription(
            "Create a giveaway."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("prize")
                    .setDescription(
                        "Giveaway prize."
                    )
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("duration")
                    .setDescription(
                        "Example: 1h, 30m, 2d."
                    )
                    .setRequired(true)
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("winners")
                    .setDescription(
                        "Number of winners."
                    )
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(20)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("task")
                    .setDescription(
                        "Optional entry task."
                    )
                    .setRequired(false)
        ),

    // ========================================================
    // EXISTING /giveaway-create
    // ========================================================

    new SlashCommandBuilder()
        .setName("giveaway-create")
        .setDescription(
            "Create a giveaway."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("prize")
                    .setDescription(
                        "Giveaway prize."
                    )
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("duration")
                    .setDescription(
                        "Example: 1h, 30m, 2d."
                    )
                    .setRequired(true)
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("winners")
                    .setDescription(
                        "Number of winners."
                    )
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(20)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("task")
                    .setDescription(
                        "Optional entry task."
                    )
                    .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("giveaway-end")
        .setDescription(
            "End a giveaway."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("giveaway_id")
                    .setDescription(
                        "Giveaway ID."
                    )
                    .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("giveaway-reroll")
        .setDescription(
            "Reroll a giveaway winner."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("giveaway_id")
                    .setDescription(
                        "Giveaway ID."
                    )
                    .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("giveaway-cancel")
        .setDescription(
            "Cancel a giveaway."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("giveaway_id")
                    .setDescription(
                        "Giveaway ID."
                    )
                    .setRequired(true)
        )

].map(
    (command) =>
        command.toJSON()
);

// ============================================================
// REGISTER GUILD COMMANDS
// ============================================================

async function registerGuildCommands() {
    try {
        const guild =
            await client.guilds.fetch(
                GUILD_ID
            );

        if (!guild) {
            console.error(
                "❌ Guild not found."
            );

            return;
        }

        const existing =
            await guild.commands.fetch();

        for (
            const commandData of
            commandDefinitions
        ) {
            const current =
                existing.find(
                    (command) =>
                        command.name ===
                        commandData.name
                );

            try {
                if (current) {
                    await current.edit(
                        commandData
                    );
                } else {
                    await guild.commands.create(
                        commandData
                    );
                }

                console.log(
                    `✅ Slash command synced: /${commandData.name}`
                );
            } catch (error) {
                console.error(
                    `❌ Failed to sync /${commandData.name}:`,
                    error
                );
            }
        }

        console.log(
            "✅ Slash commands synced."
        );
    } catch (error) {
        console.error(
            "❌ Command registration error:",
            error
        );
    }
}

// ============================================================
// MODERATION COMMAND HANDLER
// ============================================================

async function handleModerationCommand(
    interaction
) {
    const command =
        interaction.commandName;

    try {
        if (command === "warn") {
            const member =
                interaction.options.getMember(
                    "member"
                );

            const reason =
                interaction.options.getString(
                    "reason"
                ) ||
                "No reason provided.";

            if (!member) {
                return interaction.reply({
                    content:
                        "❌ Member not found.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof moderationSystem.warnMember ===
                "function"
            ) {
                return moderationSystem.warnMember(
                    interaction,
                    member,
                    reason
                );
            }
        }

        if (command === "timeout") {
            const member =
                interaction.options.getMember(
                    "member"
                );

            const duration =
                interaction.options.getInteger(
                    "duration"
                );

            const reason =
                interaction.options.getString(
                    "reason"
                ) ||
                "No reason provided.";

            if (!member) {
                return interaction.reply({
                    content:
                        "❌ Member not found.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof moderationSystem.timeoutMember ===
                "function"
            ) {
                return moderationSystem.timeoutMember(
                    interaction,
                    member,
                    duration,
                    reason
                );
            }
        }

        if (command === "kick") {
            const member =
                interaction.options.getMember(
                    "member"
                );

            const reason =
                interaction.options.getString(
                    "reason"
                ) ||
                "No reason provided.";

            if (!member) {
                return interaction.reply({
                    content:
                        "❌ Member not found.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof moderationSystem.kickMember ===
                "function"
            ) {
                return moderationSystem.kickMember(
                    interaction,
                    member,
                    reason
                );
            }
        }

        if (command === "ban") {
            const member =
                interaction.options.getMember(
                    "member"
                );

            const reason =
                interaction.options.getString(
                    "reason"
                ) ||
                "No reason provided.";

            if (!member) {
                return interaction.reply({
                    content:
                        "❌ Member not found.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof moderationSystem.banMember ===
                "function"
            ) {
                return moderationSystem.banMember(
                    interaction,
                    member,
                    reason
                );
            }
        }

        if (command === "unban") {
            const userId =
                interaction.options.getString(
                    "user_id"
                );

            const reason =
                interaction.options.getString(
                    "reason"
                ) ||
                "No reason provided.";

            if (
                typeof moderationSystem.unbanMember ===
                "function"
            ) {
                return moderationSystem.unbanMember(
                    interaction,
                    userId,
                    reason
                );
            }
        }

        if (command === "purge") {
            const amount =
                interaction.options.getInteger(
                    "amount"
                );

            if (
                typeof moderationSystem.purgeMessages ===
                "function"
            ) {
                return moderationSystem.purgeMessages(
                    interaction,
                    amount
                );
            }
        }

        return false;

    } catch (error) {
        console.error(
            "❌ Moderation command error:",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {
            return interaction.reply({
                content:
                    "❌ Moderation command failed.",
                flags:
                    MessageFlags.Ephemeral
            });
        }

        return false;
    }
}

// ============================================================
// GIVEAWAY STAFF CHECK
// ============================================================

function isGiveawayStaffMember(interaction) {
    try {
        if (!interaction?.member) {
            return false;
        }

        // Administrator always allowed.
        if (
            interaction.member.permissions?.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return true;
        }

        // Use giveaway system's own permission check
        // when available.
        if (
            typeof giveawaySystem.isGiveawayStaff ===
            "function"
        ) {
            return giveawaySystem.isGiveawayStaff(
                interaction.member
            );
        }

        // Fallback staff roles.
        const staffRoleIds = [
            "1525599169866109008",
            "1525869619196461076",
            "1525869695872532582",
            "1525869907495878756"
        ];

        return interaction.member.roles?.cache?.some(
            (role) =>
                staffRoleIds.includes(role.id)
        ) || false;

    } catch (error) {
        console.error(
            "❌ Giveaway permission check error:",
            error
        );

        return false;
    }
}

// ============================================================
// GIVEAWAY COMMAND HANDLER
// ============================================================

async function handleGiveawayCommand(
    interaction
) {
    const command =
        interaction.commandName;

    try {

        // ====================================================
        // PERMISSION CHECK
        // ====================================================

        if (
            !isGiveawayStaffMember(
                interaction
            )
        ) {
            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                return await interaction.reply({
                    content:
                        "❌ Only authorized staff can manage giveaways.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            return;
        }

        // ====================================================
        // CREATE
        //
        // Both /giveaway and /giveaway-create
        // use the same create function.
        // ====================================================

        if (
            command === "giveaway" ||
            command === "giveaway-create"
        ) {

            const prize =
                interaction.options.getString(
                    "prize"
                );

            const duration =
                interaction.options.getString(
                    "duration"
                );

            const winners =
                interaction.options.getInteger(
                    "winners"
                );

            const task =
                interaction.options.getString(
                    "task"
                ) || null;

            if (!prize) {
                return interaction.reply({
                    content:
                        "❌ Giveaway prize is required.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (!duration) {
                return interaction.reply({
                    content:
                        "❌ Giveaway duration is required.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (!winners) {
                return interaction.reply({
                    content:
                        "❌ Number of winners is required.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof giveawaySystem.createGiveaway !==
                "function"
            ) {
                return interaction.reply({
                    content:
                        "❌ Giveaway system is unavailable.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            console.log(
                `🎁 Giveaway create requested by ${interaction.user.tag}`
            );

            console.log(
                `🎁 Prize: ${prize}`
            );

            console.log(
                `⏱️ Duration: ${duration}`
            );

            console.log(
                `🏆 Winners: ${winners}`
            );

            if (task) {
                console.log(
                    `📋 Task: ${task}`
                );
            }

            // IMPORTANT:
            // Do NOT defer here.
            //
            // createGiveaway() is responsible for acknowledging
            // the interaction. This prevents a double-acknowledge
            // error if createGiveaway() uses interaction.reply().
            return await giveawaySystem.createGiveaway(
                interaction,
                {
                    prize,
                    duration,
                    winners,
                    task
                }
            );
        }

        // ====================================================
        // END
        // ====================================================

        if (
            command === "giveaway-end"
        ) {

            const giveawayId =
                interaction.options.getString(
                    "giveaway_id"
                );

            if (!giveawayId) {
                return interaction.reply({
                    content:
                        "❌ Giveaway ID is required.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof giveawaySystem.endGiveaway !==
                "function"
            ) {
                return interaction.reply({
                    content:
                        "❌ Giveaway system is unavailable.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            // Acknowledge immediately because endGiveaway
            // may need to edit the giveaway message.
            await interaction.deferReply({
                flags:
                    MessageFlags.Ephemeral
            });

            console.log(
                `🛑 Ending giveaway ${giveawayId} requested by ${interaction.user.tag}`
            );

            const result =
                await giveawaySystem.endGiveaway(
                    client,
                    giveawayId
                );

            if (result === false) {
                return interaction.editReply({
                    content:
                        "❌ Giveaway not found or already ended."
                });
            }

            return interaction.editReply({
                content:
                    "✅ Giveaway ended successfully."
            });
        }

        // ====================================================
        // REROLL
        // ====================================================

        if (
            command === "giveaway-reroll"
        ) {

            const giveawayId =
                interaction.options.getString(
                    "giveaway_id"
                );

            if (!giveawayId) {
                return interaction.reply({
                    content:
                        "❌ Giveaway ID is required.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof giveawaySystem.rerollGiveaway !==
                "function"
            ) {
                return interaction.reply({
                    content:
                        "❌ Giveaway system is unavailable.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            console.log(
                `🔄 Reroll requested for ${giveawayId} by ${interaction.user.tag}`
            );

            // The giveaway system handles its own
            // interaction acknowledgement.
            return await giveawaySystem.rerollGiveaway(
                interaction,
                giveawayId
            );
        }

        // ====================================================
        // CANCEL
        // ====================================================

        if (
            command === "giveaway-cancel"
        ) {

            const giveawayId =
                interaction.options.getString(
                    "giveaway_id"
                );

            if (!giveawayId) {
                return interaction.reply({
                    content:
                        "❌ Giveaway ID is required.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                typeof giveawaySystem.cancelGiveaway !==
                "function"
            ) {
                return interaction.reply({
                    content:
                        "❌ Giveaway system is unavailable.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            console.log(
                `❌ Cancel requested for ${giveawayId} by ${interaction.user.tag}`
            );

            // The giveaway system handles its own
            // interaction acknowledgement.
            return await giveawaySystem.cancelGiveaway(
                interaction,
                giveawayId
            );
        }

        // ====================================================
        // UNKNOWN GIVEAWAY COMMAND
        // ====================================================

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {
            return interaction.reply({
                content:
                    "❌ Unknown giveaway command.",
                flags:
                    MessageFlags.Ephemeral
            });
        }

        return false;

    } catch (error) {

        console.error(
            "❌ Giveaway command error:",
            error
        );

        // ====================================================
        // SAFE ERROR RESPONSE
        // ====================================================

        try {

            if (
                interaction.deferred
            ) {
                return await interaction.editReply({
                    content:
                        "❌ Giveaway command failed. Check the bot console for details."
                });
            }

            if (
                interaction.replied
            ) {
                return await interaction.followUp({
                    content:
                        "❌ Giveaway command failed. Check the bot console for details.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            return await interaction.reply({
                content:
                    "❌ Giveaway command failed. Check the bot console for details.",
                flags:
                    MessageFlags.Ephemeral
            });

        } catch (replyError) {

            console.error(
                "❌ Failed to send giveaway error response:",
                replyError
            );

            return false;
        }
    }
}

// ============================================================
// INTERACTION ROUTER
// ============================================================

client.on(
    "interactionCreate",
    async (interaction) => {
        try {

            // ==================================================
            // MODALS
            // ==================================================

            if (
                interaction.isModalSubmit()
            ) {
                const customId =
                    interaction.customId;

                if (
                    customId.startsWith(
                        "ticket_"
                    )
                ) {
                    if (
                        typeof ticketSystem.handleTicketModal ===
                        "function"
                    ) {
                        return await ticketSystem.handleTicketModal(
                            interaction
                        );
                    }

                    return;
                }

                if (
                    customId.startsWith(
                        "application_"
                    )
                ) {
                    if (
                        typeof applicationSystem.handleApplicationInteraction ===
                        "function"
                    ) {
                        return await applicationSystem.handleApplicationInteraction(
                            interaction
                        );
                    }

                    return;
                }

                if (
                    customId.startsWith(
                        "leave_"
                    )
                ) {
                    if (
                        typeof leaveSystem.handleLeaveInteraction ===
                        "function"
                    ) {
                        return await leaveSystem.handleLeaveInteraction(
                            interaction
                        );
                    }

                    return;
                }

                return;
            }

            // ==================================================
            // BUTTONS / SELECT MENUS
            // ==================================================

            if (
                interaction.isButton() ||
                interaction.isStringSelectMenu()
            ) {
                const customId =
                    interaction.customId;

                if (
                    customId.startsWith(
                        "ticket_"
                    )
                ) {
                    if (
                        typeof ticketSystem.handleTicketInteraction ===
                        "function"
                    ) {
                        return await ticketSystem.handleTicketInteraction(
                            interaction
                        );
                    }

                    return;
                }

                if (
                    customId.startsWith(
                        "application_"
                    )
                ) {
                    if (
                        typeof applicationSystem.handleApplicationInteraction ===
                        "function"
                    ) {
                        return await applicationSystem.handleApplicationInteraction(
                            interaction
                        );
                    }

                    return;
                }

                if (
                    customId.startsWith(
                        "leave_"
                    )
                ) {
                    if (
                        typeof leaveSystem.handleLeaveInteraction ===
                        "function"
                    ) {
                        return await leaveSystem.handleLeaveInteraction(
                            interaction
                        );
                    }

                    return;
                }

                if (
                    customId.startsWith(
                        "giveaway_"
                    )
                ) {
                    if (
                        typeof giveawaySystem.handleGiveawayInteraction ===
                        "function"
                    ) {
                        return await giveawaySystem.handleGiveawayInteraction(
                            interaction
                        );
                    }

                    return;
                }

                return;
            }

            // ==================================================
            // SLASH COMMANDS
            // ==================================================

            if (
                interaction.isChatInputCommand()
            ) {

                const command =
                    interaction.commandName;

                console.log(
                    `⚡ Slash command received: /${command} by ${interaction.user.tag}`
                );

                // ----------------------------------------------
                // MODERATION
                // ----------------------------------------------

                if (
                    [
                        "warn",
                        "timeout",
                        "kick",
                        "ban",
                        "unban",
                        "purge"
                    ].includes(command)
                ) {
                    return await handleModerationCommand(
                        interaction
                    );
                }

                // ----------------------------------------------
                // GIVEAWAYS
                // ----------------------------------------------

                if (
                    [
                        "giveaway",
                        "giveaway-create",
                        "giveaway-end",
                        "giveaway-reroll",
                        "giveaway-cancel"
                    ].includes(command)
                ) {
                    return await handleGiveawayCommand(
                        interaction
                    );
                }

                // ----------------------------------------------
                // UNKNOWN COMMAND
                // ----------------------------------------------

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    return await interaction.reply({
                        content:
                            "❌ This command is not currently handled by The Wolf Community bot.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }
            }

        } catch (error) {

            console.error(
                "❌ Interaction router error:",
                error
            );

            try {

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({
                        content:
                            "❌ Something went wrong while processing this interaction.",
                        flags:
                            MessageFlags.Ephemeral
                    });

                } else {

                    await interaction.followUp({
                        content:
                            "❌ Something went wrong while processing this interaction.",
                        flags:
                            MessageFlags.Ephemeral
                    });

                }

            } catch {
                // Interaction already expired/replied.
            }
        }
    }
);

// ============================================================
// VERIFICATION CONFIG
// ============================================================

const VERIFICATION_VC_ID =
    verificationSystem.VERIFICATION_VC_ID ||
    "1548335367101350060";

const UNVERIFIED_ROLE_ID =
    verificationSystem.UNVERIFIED_ROLE_ID ||
    "1550775394758688829";

const CUB_ROLE_ID =
    verificationSystem.CUB_ROLE_ID ||
    "1525573700357984258";

const WELCOME_CHANNEL_ID =
    "1525552321885507745";

// ============================================================
// FORCE MEMBER INTO FRESH UNVERIFIED STATE
// ============================================================

async function resetMemberToUnverified(member) {

    if (!member) {
        throw new Error(
            "Member is required."
        );
    }

    const guild =
        member.guild;

    const freshMember =
        await guild.members.fetch(
            member.id
        );

    const botMember =
        guild.members.me ||
        await guild.members.fetchMe();

    if (!botMember) {
        throw new Error(
            "Could not find the bot's GuildMember."
        );
    }

    const unverifiedRole =
        guild.roles.cache.get(
            UNVERIFIED_ROLE_ID
        );

    if (!unverifiedRole) {
        throw new Error(
            `Unverified role not found: ${UNVERIFIED_ROLE_ID}`
        );
    }

    if (
        unverifiedRole.managed ||
        unverifiedRole.position >=
            botMember.roles.highest.position
    ) {
        throw new Error(
            "Bot cannot manage Unverified role. Move the bot role above Unverified."
        );
    }

    const rolesToRemove =
        freshMember.roles.cache.filter(
            (role) => {

                if (
                    role.id ===
                    guild.id
                ) {
                    return false;
                }

                if (role.managed) {
                    return false;
                }

                if (
                    role.position >=
                    botMember.roles.highest.position
                ) {

                    console.warn(
                        `⚠️ Cannot remove "${role.name}" from ${freshMember.user.tag} because it is above or equal to the bot's highest role.`
                    );

                    return false;
                }

                return true;
            }
        );

    for (
        const role
        of rolesToRemove.values()
    ) {

        try {

            await freshMember.roles.remove(
                role,
                "Fresh verification required after joining/rejoining"
            );

            console.log(
                `🗑️ Removed role "${role.name}" from ${freshMember.user.tag}`
            );

        } catch (error) {

            console.error(
                `❌ Failed to remove "${role.name}" from ${freshMember.user.tag}:`,
                error
            );

        }
    }

    let cleanedMember =
        await guild.members.fetch(
            member.id
        );

    if (
        !cleanedMember.roles.cache.has(
            UNVERIFIED_ROLE_ID
        )
    ) {

        await cleanedMember.roles.add(
            unverifiedRole,
            "Fresh verification required after joining/rejoining"
        );

        console.log(
            `🔐 Added Unverified role to ${cleanedMember.user.tag}`
        );
    }

    cleanedMember =
        await guild.members.fetch(
            member.id
        );

    const remainingRoles =
        cleanedMember.roles.cache.filter(
            (role) =>
                role.id !== guild.id
        );

    const unwantedRoles =
        remainingRoles.filter(
            (role) =>
                role.id !==
                UNVERIFIED_ROLE_ID
        );

    if (
        unwantedRoles.size === 0
    ) {

        console.log(
            `✅ ${cleanedMember.user.tag} now has ONLY Unverified.`
        );

    } else {

        console.warn(
            `⚠️ ${cleanedMember.user.tag} still has these roles:`
        );

        for (
            const role
            of unwantedRoles.values()
        ) {

            console.warn(
                `   • ${role.name} (${role.id})`
            );
        }
    }

    return cleanedMember;
}

// ============================================================
// MEMBER JOIN / REJOIN
// ============================================================

client.on(
    Events.GuildMemberAdd,
    async member => {

        try {

            if (member.user.bot) {
                return;
            }

            if (
                member.guild.id !==
                GUILD_ID
            ) {
                return;
            }

            console.log(
                `👋 Member rejoined/joined: ${member.user.tag}`
            );

            let freshMember;

            try {

                freshMember =
                    await resetMemberToUnverified(
                        member
                    );

                console.log(
                    `🔐 ${freshMember.user.tag} has been reset to fresh verification state.`
                );

            } catch (error) {

                console.error(
                    `❌ Failed to reset ${member.user.tag} to Unverified:`,
                    error
                );

                try {

                    freshMember =
                        await member.guild.members.fetch(
                            member.id
                        );

                } catch {

                    freshMember =
                        member;
                }
            }

            try {

                const updatedMember =
                    await member.guild.members.fetch(
                        member.id
                    );

                const roleNames =
                    updatedMember.roles.cache
                        .filter(
                            (role) =>
                                role.id !==
                                member.guild.id
                        )
                        .map(
                            (role) =>
                                role.name
                        );

                console.log(
                    `🔎 Final roles for ${updatedMember.user.tag}:`,
                    roleNames.length
                        ? roleNames.join(", ")
                        : "NO ROLES"
                );

                freshMember =
                    updatedMember;

            } catch (error) {

                console.error(
                    "⚠️ Could not perform final role check:",
                    error
                );
            }

            const channel =
                member.guild.channels.cache.get(
                    WELCOME_CHANNEL_ID
                );

            if (
                channel &&
                channel.isTextBased()
            ) {

                try {

                    await channel.send({

                        content:
                            `🐺 Welcome ${freshMember}! Please join <#${VERIFICATION_VC_ID}> to complete verification.`

                    });

                } catch (error) {

                    console.error(
                        "❌ Failed to send welcome message:",
                        error
                    );
                }
            }

            addActivity({

                type:
                    "member_join",

                title:
                    "New member joined",

                description:
                    `${freshMember.user.tag} joined The Wolf Community and was placed into verification.`,

                userId:
                    freshMember.id,

                username:
                    freshMember.user.tag,

                icon:
                    "👋"

            });

            console.log(
                `🔐 ${freshMember.user.tag} is now required to verify.`
            );

        } catch (error) {

            console.error(
                "❌ Member join/rejoin error:",
                error
            );
        }

    }
);

// ============================================================
// VERIFICATION VOICE
// ============================================================

client.on(
    "voiceStateUpdate",
    async (
        oldState,
        newState
    ) => {

        try {

            const member =
                newState.member;

            if (!member) {
                return;
            }

            if (member.user.bot) {
                return;
            }

            if (
                member.guild.id !==
                GUILD_ID
            ) {
                return;
            }

            if (
                newState.channelId !==
                VERIFICATION_VC_ID
            ) {
                return;
            }

            if (
                oldState.channelId ===
                VERIFICATION_VC_ID
            ) {
                return;
            }

            if (
                !member.roles.cache.has(
                    UNVERIFIED_ROLE_ID
                )
            ) {
                return;
            }

            console.log(
                `🔊 Verification VC joined: ${member.user.tag}`
            );

            if (
                typeof verificationSystem.playVerificationWelcome ===
                "function"
            ) {

                await verificationSystem.playVerificationWelcome(
                    member
                );

            }

            addActivity({

                type:
                    "voice",

                title:
                    "Verification Started",

                description:
                    `${member.user.username} joined the verification VC.`,

                userId:
                    member.id,

                username:
                    member.user.username,

                icon:
                    "🔊"

            });

        } catch (error) {

            console.error(
                "❌ Verification voice error:",
                error
            );
        }
    }
);

// ============================================================
// BOT READY
// ============================================================

client.once(
    "ready",
    async (readyClient) => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "🐺 THE WOLF COMMUNITY BOT"
        );

        console.log(
            "========================================"
        );

        console.log(
            `✅ Logged in as ${readyClient.user.tag}`
        );

        console.log(
            `🏠 Guild ID: ${GUILD_ID}`
        );

        console.log(
            `🌐 API: http://localhost:${BOT_API_PORT}`
        );

        console.log(
            "========================================"
        );

        addActivity({

            type:
                "system",

            title:
                "Bot Online",

            description:
                "The Wolf Community bot is now online.",

            icon:
                "🐺"

        });

        // Panels
        await setupPanels();

        // Slash commands
        await registerGuildCommands();

        // Initialize verification voice system
        if (
            typeof verificationSystem.initVerificationVoice ===
            "function"
        ) {

            await verificationSystem.initVerificationVoice(
                client
            );
        }

        console.log(
            "🐺 The Wolf Community is ready."
        );

    }
);

// ============================================================
// CLIENT ERRORS
// ============================================================

client.on(
    "error",
    (error) => {

        console.error(
            "❌ Discord client error:",
            error
        );
    }
);

client.on(
    "warn",
    (message) => {

        console.warn(
            "⚠️ Discord warning:",
            message
        );
    }
);

// ============================================================
// PROCESS ERRORS
// ============================================================

process.on(
    "unhandledRejection",
    (error) => {

        console.error(
            "❌ Unhandled promise rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "❌ Uncaught exception:",
            error
        );
    }
);

// ============================================================
// LOGIN
// ============================================================

console.log(
    "🐺 Starting The Wolf Community bot..."
);

client.login(
    DISCORD_TOKEN
).catch(
    (error) => {

        console.error(
            "❌ Discord login failed:",
            error
        );

        process.exit(1);
    }
);