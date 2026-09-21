import "dotenv/config";

import {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} from "discord.js";

// ==========================================
// CONFIG
// ==========================================

const TOKEN =
    process.env.DISCORD_TOKEN;

const CLIENT_ID =
    process.env.CLIENT_ID;

const GUILD_ID =
    process.env.GUILD_ID;

// ==========================================
// COMMANDS
// ==========================================

const commands = [

    // ======================================
    // WARN
    // ======================================

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription(
            "Warn a member"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to warn"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the warning"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    // ======================================
    // TIMEOUT
    // ======================================

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription(
            "Timeout a member"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to timeout"
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("duration")
                .setDescription(
                    "Timeout duration in minutes"
                )
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the timeout"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    // ======================================
    // KICK
    // ======================================

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription(
            "Kick a member"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to kick"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the kick"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        ),

    // ======================================
    // BAN
    // ======================================

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription(
            "Ban a member"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to ban"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the ban"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        ),

    // ======================================
    // UNBAN
    // ======================================

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription(
            "Unban a user"
        )
        .addStringOption(option =>
            option
                .setName("user_id")
                .setDescription(
                    "Discord user ID"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the unban"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        ),

    // ======================================
    // PURGE
    // ======================================

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription(
            "Delete messages from this channel"
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(
                    "Number of messages to delete"
                )
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )

].map(command =>
    command.toJSON()
);

// ==========================================
// VALIDATION
// ==========================================

if (!TOKEN) {

    console.error(
        "❌ DISCORD_TOKEN is missing."
    );

    process.exit(1);
}

if (!CLIENT_ID) {

    console.error(
        "❌ CLIENT_ID is missing."
    );

    process.exit(1);
}

if (!GUILD_ID) {

    console.error(
        "❌ GUILD_ID is missing."
    );

    process.exit(1);
}

// ==========================================
// REST
// ==========================================

const rest =
    new REST({
        version: "10"
    }).setToken(
        TOKEN
    );

// ==========================================
// REGISTER
// ==========================================

async function deployCommands() {

    try {

        console.log(
            "🔄 Registering Wolf moderation commands..."
        );

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "✅ Moderation commands registered successfully."
        );

        console.log(
            "📋 Commands:"
        );

        console.log(
            "   /warn"
        );

        console.log(
            "   /timeout"
        );

        console.log(
            "   /kick"
        );

        console.log(
            "   /ban"
        );

        console.log(
            "   /unban"
        );

        console.log(
            "   /purge"
        );

    } catch (error) {

        console.error(
            "❌ Command registration failed:"
        );

        console.error(error);

        process.exit(1);
    }
}

await deployCommands();