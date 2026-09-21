import "dotenv/config";

import {
    REST,
    Routes,
    SlashCommandBuilder
} from "discord.js";

const TOKEN =
    process.env.DISCORD_TOKEN;

const CLIENT_ID =
    process.env.CLIENT_ID;

const GUILD_ID =
    process.env.GUILD_ID;


// ============================================================
// GIVEAWAY COMMANDS
// ============================================================

const commands = [

    // --------------------------------------------------------
    // /giveaway
    // --------------------------------------------------------

    new SlashCommandBuilder()

        .setName("giveaway")

        .setDescription(
            "Create a new giveaway"
        )

        .addStringOption(option =>
            option

                .setName("prize")

                .setDescription(
                    "Giveaway prize"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("duration")

                .setDescription(
                    "Example: 10m, 1h, 2d"
                )

                .setRequired(true)
        )

        .addIntegerOption(option =>
            option

                .setName("winners")

                .setDescription(
                    "Number of winners"
                )

                .setMinValue(1)

                .setMaxValue(50)

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("task")

                .setDescription(
                    "Optional task for participants"
                )

                .setRequired(false)
        ),


    // --------------------------------------------------------
    // /giveaway-reroll
    // --------------------------------------------------------

    new SlashCommandBuilder()

        .setName("giveaway-reroll")

        .setDescription(
            "Reroll a completed giveaway"
        )

        .addStringOption(option =>
            option

                .setName("giveaway_id")

                .setDescription(
                    "Giveaway ID"
                )

                .setRequired(true)
        ),


    // --------------------------------------------------------
    // /giveaway-cancel
    // --------------------------------------------------------

    new SlashCommandBuilder()

        .setName("giveaway-cancel")

        .setDescription(
            "Cancel an active giveaway"
        )

        .addStringOption(option =>
            option

                .setName("giveaway_id")

                .setDescription(
                    "Giveaway ID"
                )

                .setRequired(true)
        )

].map(
    command => command.toJSON()
);


// ============================================================
// VALIDATION
// ============================================================

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


// ============================================================
// REGISTER COMMANDS
// ============================================================

const rest =
    new REST({
        version: "10"
    }).setToken(TOKEN);


try {

    console.log(
        "🔄 Registering giveaway commands..."
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
        "✅ Giveaway commands registered."
    );

    console.log(
        "   /giveaway"
    );

    console.log(
        "   /giveaway-reroll"
    );

    console.log(
        "   /giveaway-cancel"
    );


} catch (error) {

    console.error(
        "❌ Giveaway command registration failed:"
    );

    console.error(error);

    process.exit(1);

}