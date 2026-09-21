// ============================================================
// THE WOLF COMMUNITY
// GIVEAWAY SYSTEM
// src/systems/giveawaySystem.js
// ============================================================

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} from "discord.js";

// ============================================================
// CONFIG
// ============================================================

const GIVEAWAY_CHANNEL_ID =
    "1525555181951914095";

const GIVEAWAY_LOG_CHANNEL_ID =
    "1550776046041960471";

const STAFF_ROLE_IDS = [
    "1525599169866109008", // Supreme Wolf Owner
    "1525869619196461076", // Counch
    "1525869695872532582", // Guardian
    "1525869907495878756"  // Moderator
];

// ============================================================
// MEMORY STORE
// ============================================================

const giveaways = new Map();

let giveawayCounter = 1;

// ============================================================
// SAFE INTERACTION HELPERS
// ============================================================

async function safeReply(interaction, payload) {
    try {
        if (!interaction) {
            return false;
        }

        if (interaction.replied) {
            await interaction.followUp(payload);
            return true;
        }

        if (interaction.deferred) {
            await interaction.editReply(payload);
            return true;
        }

        await interaction.reply(payload);
        return true;

    } catch (error) {
        console.error(
            "❌ Giveaway safeReply error:",
            error
        );

        return false;
    }
}

// ============================================================
// DEFER HELPER
// ============================================================

async function deferEphemeral(interaction) {
    try {
        if (
            !interaction.deferred &&
            !interaction.replied
        ) {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });
        }

        return true;

    } catch (error) {
        console.error(
            "❌ Giveaway defer error:",
            error
        );

        return false;
    }
}

// ============================================================
// STAFF PERMISSION
// ============================================================

export function isGiveawayStaff(member) {

    if (!member) {
        return false;
    }

    try {
        if (
            member.permissions &&
            member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return true;
        }
    } catch {}

    if (member.roles?.cache) {
        return STAFF_ROLE_IDS.some(
            roleId =>
                member.roles.cache.has(roleId)
        );
    }

    return false;
}

// ============================================================
// STAFF CHECK
// ============================================================

async function requireGiveawayStaff(interaction) {

    if (
        isGiveawayStaff(
            interaction.member
        )
    ) {
        return true;
    }

    await safeReply(
        interaction,
        {
            content:
                "❌ You do not have permission to manage giveaways.",
            flags:
                MessageFlags.Ephemeral
        }
    );

    return false;
}

// ============================================================
// ID GENERATOR
// ============================================================

function createGiveawayId() {

    const id =
        `GW-${String(giveawayCounter).padStart(4, "0")}`;

    giveawayCounter++;

    return id;
}

// ============================================================
// RANDOM WINNERS
// ============================================================

function pickRandomWinners(
    entries,
    winnerCount
) {

    const pool = [...entries];

    const winners = [];

    const count = Math.min(
        Math.max(
            Number(winnerCount) || 1,
            1
        ),
        pool.length
    );

    while (
        winners.length < count &&
        pool.length > 0
    ) {

        const index =
            Math.floor(
                Math.random() * pool.length
            );

        const winner =
            pool.splice(index, 1)[0];

        winners.push(winner);
    }

    return winners;
}

// ============================================================
// DURATION PARSER
// ============================================================

function parseDuration(duration) {

    // Already a number
    if (
        typeof duration === "number" &&
        Number.isFinite(duration)
    ) {
        return duration * 60 * 1000;
    }

    if (
        duration === null ||
        duration === undefined
    ) {
        return 60 * 60 * 1000;
    }

    const value =
        String(duration)
            .trim()
            .toLowerCase();

    if (!value) {
        return 60 * 60 * 1000;
    }

    // Plain number = minutes
    if (/^\d+(\.\d+)?$/.test(value)) {

        const minutes =
            Number(value);

        if (!Number.isFinite(minutes)) {
            return null;
        }

        return minutes * 60 * 1000;
    }

    // Supported:
    // 10sec
    // 10secs
    // 10second
    // 10seconds
    // 10s
    // 10m
    // 10min
    // 10mins
    // 10minute
    // 10minutes
    // 10h
    // 10hr
    // 10hrs
    // 10hour
    // 10hours
    // 10d
    // 10day
    // 10days

    const match =
        value.match(
            /^(\d+(?:\.\d+)?)\s*(sec|secs|second|seconds|s|min|mins|minute|minutes|m|hr|hrs|hour|hours|h|day|days|d)$/
        );

    if (!match) {
        return null;
    }

    const amount =
        Number(match[1]);

    const unit =
        match[2];

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return null;
    }

    let multiplier;

    if (
        [
            "sec",
            "secs",
            "second",
            "seconds",
            "s"
        ].includes(unit)
    ) {
        multiplier = 1000;
    }

    else if (
        [
            "min",
            "mins",
            "minute",
            "minutes",
            "m"
        ].includes(unit)
    ) {
        multiplier = 60 * 1000;
    }

    else if (
        [
            "hr",
            "hrs",
            "hour",
            "hours",
            "h"
        ].includes(unit)
    ) {
        multiplier = 60 * 60 * 1000;
    }

    else if (
        [
            "day",
            "days",
            "d"
        ].includes(unit)
    ) {
        multiplier = 24 * 60 * 60 * 1000;
    }

    else {
        return null;
    }

    return amount * multiplier;
}

// ============================================================
// FORMAT DURATION
// ============================================================

function formatDuration(milliseconds) {

    if (
        !Number.isFinite(milliseconds) ||
        milliseconds <= 0
    ) {
        return "Unknown";
    }

    const seconds =
        Math.round(
            milliseconds / 1000
        );

    if (seconds < 60) {
        return `${seconds} second${seconds === 1 ? "" : "s"}`;
    }

    const minutes =
        Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    }

    const hours =
        Math.round(minutes / 60);

    if (hours < 24) {
        return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    const days =
        Math.round(hours / 24);

    return `${days} day${days === 1 ? "" : "s"}`;
}

// ============================================================
// FORMAT TIME
// ============================================================

function formatTimestamp(timestamp) {

    if (!timestamp) {
        return "Unknown";
    }

    const date =
        new Date(timestamp);

    const time =
        date.getTime();

    if (!Number.isFinite(time)) {
        return "Unknown";
    }

    const unix =
        Math.floor(
            time / 1000
        );

    if (!Number.isFinite(unix)) {
        return "Unknown";
    }

    return `<t:${unix}:R>`;
}

// ============================================================
// GIVEAWAY EMBED
// ============================================================

function createGiveawayEmbed(giveaway) {

    const statusText =
        giveaway.status === "active"
            ? "🟢 ACTIVE"
            : giveaway.status === "ended"
                ? "🔴 ENDED"
                : "⚫ CANCELLED";

    const winnersText =
        giveaway.winners?.length
            ? giveaway.winners
                .map(
                    userId =>
                        `<@${userId}>`
                )
                .join(", ")
            : "Not selected yet";

    return new EmbedBuilder()

        .setColor(
            giveaway.status === "active"
                ? 0xff00a8
                : 0x555555
        )

        .setTitle(
            `🎁 ${giveaway.prize}`
        )

        .setDescription(
            [
                `**Status:** ${statusText}`,
                "",
                giveaway.description ||
                    "Join the giveaway by clicking the button below.",
                "",
                `🏆 **Winners:** ${giveaway.winnerCount}`,
                `👥 **Entries:** ${giveaway.entries.length}`,
                `⏰ **Ends:** ${formatTimestamp(giveaway.endsAt)}`,
                "",
                giveaway.status === "ended"
                    ? `🎉 **Winner(s):** ${winnersText}`
                    : ""
            ]
                .filter(Boolean)
                .join("\n")
        )

        .setFooter({
            text:
                `The Wolf Community • ${giveaway.id}`
        })

        .setTimestamp();
}

// ============================================================
// GIVEAWAY BUTTONS
// ============================================================

function createGiveawayButtons(giveaway) {

    const enterButton =
        new ButtonBuilder()
            .setCustomId(
                `giveaway_enter:${giveaway.id}`
            )
            .setLabel(
                "Enter Giveaway"
            )
            .setEmoji("🎉")
            .setStyle(
                ButtonStyle.Success
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                enterButton
            );

    return [row];
}

// ============================================================
// UPDATE GIVEAWAY MESSAGE
// ============================================================

async function updateGiveawayMessage(
    client,
    giveaway
) {

    try {

        if (!giveaway.messageId) {
            return false;
        }

        const channel =
            await client.channels
                .fetch(
                    giveaway.channelId
                )
                .catch(
                    () => null
                );

        if (
            !channel ||
            !channel.isTextBased()
        ) {
            return false;
        }

        const message =
            await channel.messages
                .fetch(
                    giveaway.messageId
                )
                .catch(
                    () => null
                );

        if (!message) {
            return false;
        }

        const components =
            giveaway.status === "active"
                ? createGiveawayButtons(
                    giveaway
                )
                : [];

        await message.edit({
            embeds: [
                createGiveawayEmbed(
                    giveaway
                )
            ],
            components
        });

        return true;

    } catch (error) {

        console.error(
            "❌ Failed to update giveaway message:",
            error
        );

        return false;
    }
}

// ============================================================
// LOG GIVEAWAY
// ============================================================

async function logGiveaway(
    client,
    title,
    description
) {

    try {

        const channel =
            await client.channels
                .fetch(
                    GIVEAWAY_LOG_CHANNEL_ID
                )
                .catch(
                    () => null
                );

        if (
            !channel ||
            !channel.isTextBased()
        ) {
            console.warn(
                "⚠️ Giveaway log channel not found."
            );

            return;
        }

        const embed =
            new EmbedBuilder()
                .setColor(0xff00a8)
                .setTitle(title)
                .setDescription(
                    description
                )
                .setTimestamp()
                .setFooter({
                    text:
                        "The Wolf Community • Giveaway Logs"
                });

        await channel.send({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "❌ Giveaway logging error:",
            error
        );
    }
}

// ============================================================
// CREATE GIVEAWAY
// ============================================================

export async function createGiveaway(
    interaction,
    options = {}
) {

    const deferred =
        await deferEphemeral(
            interaction
        );

    if (!deferred) {
        return false;
    }

    try {

        // ----------------------------------------------------
        // PERMISSION
        // ----------------------------------------------------

        if (
            !await requireGiveawayStaff(
                interaction
            )
        ) {
            return false;
        }

        // ----------------------------------------------------
        // OPTIONS
        // ----------------------------------------------------

        const prize =
            String(
                options.prize ||
                "Giveaway Prize"
            ).trim();

        const description =
            String(
                options.description ||
                options.task ||
                "Join the giveaway by clicking the button below."
            ).trim();

        const rawWinnerCount =
            Number(
                options.winners ??
                options.winnerCount ??
                1
            );

        const winnerCount =
            Math.max(
                1,
                Math.min(
                    20,
                    Number.isFinite(
                        rawWinnerCount
                    )
                        ? Math.floor(
                            rawWinnerCount
                        )
                        : 1
                )
            );

        // ----------------------------------------------------
        // DURATION
        // ----------------------------------------------------

        const rawDuration =
            options.duration ??
            options.durationMinutes ??
            60;

        const durationMs =
            parseDuration(
                rawDuration
            );

        if (
            !Number.isFinite(
                durationMs
            ) ||
            durationMs <= 0
        ) {

            await interaction.editReply({
                content:
                    [
                        "❌ **Invalid giveaway duration.**",
                        "",
                        "Use formats such as:",
                        "`10sec`",
                        "`30s`",
                        "`5m`",
                        "`1h`",
                        "`2d`"
                    ].join("\n")
            });

            return false;
        }

        // Maximum 30 days
        const MAX_DURATION =
            30 *
            24 *
            60 *
            60 *
            1000;

        if (
            durationMs >
            MAX_DURATION
        ) {

            await interaction.editReply({
                content:
                    "❌ Giveaway duration cannot be longer than 30 days."
            });

            return false;
        }

        // ----------------------------------------------------
        // CHANNEL
        // ----------------------------------------------------

        let channel =
            interaction.client.channels.cache.get(
                GIVEAWAY_CHANNEL_ID
            );

        if (!channel) {

            channel =
                await interaction.client.channels
                    .fetch(
                        GIVEAWAY_CHANNEL_ID
                    )
                    .catch(
                        () => null
                    );
        }

        if (
            !channel ||
            !channel.isTextBased()
        ) {

            await interaction.editReply({
                content:
                    `❌ Giveaway channel was not found.\nChannel ID: \`${GIVEAWAY_CHANNEL_ID}\``
            });

            return false;
        }

        // ----------------------------------------------------
        // CREATE DATA
        // ----------------------------------------------------

        const giveawayId =
            createGiveawayId();

        const createdAt =
            new Date();

        const endsAt =
            new Date(
                createdAt.getTime() +
                durationMs
            );

        // Extra safety check
        if (
            Number.isNaN(
                endsAt.getTime()
            )
        ) {

            await interaction.editReply({
                content:
                    "❌ Failed to calculate giveaway end time."
            });

            return false;
        }

        const giveaway = {

            id:
                giveawayId,

            prize,

            description,

            winnerCount,

            durationMs,

            durationText:
                formatDuration(
                    durationMs
                ),

            channelId:
                channel.id,

            messageId:
                null,

            creatorId:
                interaction.user.id,

            creatorUsername:
                interaction.user.tag ||
                interaction.user.username,

            entries:
                [],

            winners:
                [],

            status:
                "active",

            createdAt:
                createdAt.toISOString(),

            endsAt:
                endsAt.toISOString(),

            endedAt:
                null,

            cancelledAt:
                null,

            cancelledBy:
                null
        };

        // ----------------------------------------------------
        // SAVE BEFORE SEND
        // ----------------------------------------------------

        giveaways.set(
            giveawayId,
            giveaway
        );

        // ----------------------------------------------------
        // SEND GIVEAWAY
        // ----------------------------------------------------

        const message =
            await channel.send({

                embeds: [
                    createGiveawayEmbed(
                        giveaway
                    )
                ],

                components:
                    createGiveawayButtons(
                        giveaway
                    )

            });

        giveaway.messageId =
            message.id;

        giveaways.set(
            giveawayId,
            giveaway
        );

        // ----------------------------------------------------
        // AUTO END TIMER
        // ----------------------------------------------------

        setTimeout(
            async () => {

                try {

                    const current =
                        giveaways.get(
                            giveawayId
                        );

                    if (
                        !current ||
                        current.status !== "active"
                    ) {
                        return;
                    }

                    await endGiveaway(
                        interaction.client,
                        giveawayId
                    );

                } catch (error) {

                    console.error(
                        `❌ Auto-end failed for ${giveawayId}:`,
                        error
                    );
                }

            },
            durationMs
        );

        // ----------------------------------------------------
        // LOG
        // ----------------------------------------------------

        await logGiveaway(
            interaction.client,
            "🎁 Giveaway Created",
            [
                `**Giveaway:** \`${giveawayId}\``,
                `**Prize:** ${prize}`,
                `**Winners:** ${winnerCount}`,
                `**Duration:** ${formatDuration(durationMs)}`,
                `**Created By:** <@${interaction.user.id}>`,
                `**Channel:** <#${channel.id}>`
            ].join("\n")
        );

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        await interaction.editReply({

            content:
                [
                    "✅ **Giveaway created successfully.**",
                    "",
                    `🎁 **Prize:** ${prize}`,
                    `🏆 **Winners:** ${winnerCount}`,
                    `⏰ **Duration:** ${formatDuration(durationMs)}`,
                    `🆔 **ID:** \`${giveawayId}\``,
                    `📍 **Channel:** <#${channel.id}>`
                ].join("\n")

        });

        return giveaway;

    } catch (error) {

        console.error(
            "❌ Create giveaway error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Failed to create the giveaway.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ============================================================
// ENTER GIVEAWAY
// ============================================================

export async function enterGiveaway(
    interaction,
    giveawayId
) {

    try {

        const deferred =
            await deferEphemeral(
                interaction
            );

        if (!deferred) {
            return false;
        }

        const giveaway =
            giveaways.get(
                giveawayId
            );

        if (!giveaway) {

            await interaction.editReply({
                content:
                    "❌ Giveaway not found."
            });

            return false;
        }

        if (
            giveaway.status !== "active"
        ) {

            await interaction.editReply({
                content:
                    "❌ This giveaway is no longer active."
            });

            return false;
        }

        const endsAtTime =
            new Date(
                giveaway.endsAt
            ).getTime();

        if (
            !Number.isFinite(
                endsAtTime
            ) ||
            endsAtTime <= Date.now()
        ) {

            await interaction.editReply({
                content:
                    "❌ This giveaway has already ended."
            });

            return false;
        }

        // ----------------------------------------------------
        // PREVENT DUPLICATE ENTRY
        // ----------------------------------------------------

        if (
            giveaway.entries.includes(
                interaction.user.id
            )
        ) {

            await interaction.editReply({
                content:
                    "⚠️ You are already entered in this giveaway."
            });

            return false;
        }

        // ----------------------------------------------------
        // ADD ENTRY
        // ----------------------------------------------------

        giveaway.entries.push(
            interaction.user.id
        );

        giveaways.set(
            giveawayId,
            giveaway
        );

        // ----------------------------------------------------
        // UPDATE MESSAGE
        // ----------------------------------------------------

        await updateGiveawayMessage(
            interaction.client,
            giveaway
        );

        await interaction.editReply({

            content:
                [
                    "🎉 **Entry confirmed!**",
                    "",
                    `You entered **${giveaway.prize}**.`,
                    `🆔 Giveaway: \`${giveaway.id}\``,
                    `👥 Total entries: **${giveaway.entries.length}**`
                ].join("\n")

        });

        return true;

    } catch (error) {

        console.error(
            "❌ Enter giveaway error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Failed to enter the giveaway.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ============================================================
// END GIVEAWAY
// ============================================================

export async function endGiveaway(
    client,
    giveawayId
) {

    try {

        const giveaway =
            giveaways.get(
                giveawayId
            );

        if (!giveaway) {

            console.warn(
                `⚠️ Giveaway not found: ${giveawayId}`
            );

            return false;
        }

        if (
            giveaway.status !== "active"
        ) {

            return false;
        }

        // ----------------------------------------------------
        // MARK ENDED
        // ----------------------------------------------------

        giveaway.status =
            "ended";

        giveaway.endedAt =
            new Date().toISOString();

        // ----------------------------------------------------
        // PICK WINNERS
        // ----------------------------------------------------

        giveaway.winners =
            pickRandomWinners(
                giveaway.entries,
                giveaway.winnerCount
            );

        giveaways.set(
            giveawayId,
            giveaway
        );

        // ----------------------------------------------------
        // UPDATE ORIGINAL MESSAGE
        // ----------------------------------------------------

        await updateGiveawayMessage(
            client,
            giveaway
        );

        // ----------------------------------------------------
        // SEND RESULT
        // ----------------------------------------------------

        const channel =
            await client.channels
                .fetch(
                    giveaway.channelId
                )
                .catch(
                    () => null
                );

        if (
            channel &&
            channel.isTextBased()
        ) {

            let winnerText =
                "No valid winners.";

            if (
                giveaway.winners.length
            ) {

                winnerText =
                    giveaway.winners
                        .map(
                            userId =>
                                `<@${userId}>`
                        )
                        .join(", ");

            }

            await channel.send({

                content:
                    [
                        "🎉 **GIVEAWAY ENDED!**",
                        "",
                        `🎁 **Prize:** ${giveaway.prize}`,
                        `🏆 **Winner(s):** ${winnerText}`,
                        "",
                        "Congratulations! 🐺"
                    ].join("\n")

            });

        }

        // ----------------------------------------------------
        // LOG
        // ----------------------------------------------------

        await logGiveaway(
            client,
            "🏁 Giveaway Ended",
            [
                `**Giveaway:** \`${giveaway.id}\``,
                `**Prize:** ${giveaway.prize}`,
                `**Entries:** ${giveaway.entries.length}`,
                `**Winner(s):** ${
                    giveaway.winners.length
                        ? giveaway.winners
                            .map(
                                id =>
                                    `<@${id}>`
                            )
                            .join(", ")
                        : "None"
                }`
            ].join("\n")
        );

        return giveaway;

    } catch (error) {

        console.error(
            `❌ End giveaway error (${giveawayId}):`,
            error
        );

        return false;
    }
}

// ============================================================
// REROLL GIVEAWAY
// ============================================================

export async function rerollGiveaway(
    interaction,
    giveawayId
) {

    const deferred =
        await deferEphemeral(
            interaction
        );

    if (!deferred) {
        return false;
    }

    try {

        // ----------------------------------------------------
        // PERMISSION
        // ----------------------------------------------------

        if (
            !await requireGiveawayStaff(
                interaction
            )
        ) {
            return false;
        }

        // ----------------------------------------------------
        // FIND GIVEAWAY
        // ----------------------------------------------------

        const giveaway =
            giveaways.get(
                giveawayId
            );

        if (!giveaway) {

            await interaction.editReply({
                content:
                    "❌ Giveaway not found."
            });

            return false;
        }

        if (
            giveaway.status !== "ended"
        ) {

            await interaction.editReply({
                content:
                    "❌ You can only reroll an ended giveaway."
            });

            return false;
        }

        if (
            giveaway.entries.length === 0
        ) {

            await interaction.editReply({
                content:
                    "❌ There are no entries to reroll."
            });

            return false;
        }

        // ----------------------------------------------------
        // PREVIOUS WINNERS REMOVED
        // ----------------------------------------------------

        const availableEntries =
            giveaway.entries.filter(
                userId =>
                    !giveaway.winners.includes(
                        userId
                    )
            );

        const pool =
            availableEntries.length > 0
                ? availableEntries
                : giveaway.entries;

        const newWinners =
            pickRandomWinners(
                pool,
                giveaway.winnerCount
            );

        giveaway.winners =
            newWinners;

        giveaway.endedAt =
            new Date().toISOString();

        giveaways.set(
            giveawayId,
            giveaway
        );

        // ----------------------------------------------------
        // UPDATE MESSAGE
        // ----------------------------------------------------

        await updateGiveawayMessage(
            interaction.client,
            giveaway
        );

        // ----------------------------------------------------
        // SEND REROLL
        // ----------------------------------------------------

        const channel =
            await interaction.client.channels
                .fetch(
                    giveaway.channelId
                )
                .catch(
                    () => null
                );

        if (
            channel &&
            channel.isTextBased()
        ) {

            await channel.send({

                content:
                    [
                        "🔄 **GIVEAWAY REROLLED!**",
                        "",
                        `🎁 **Prize:** ${giveaway.prize}`,
                        `🏆 **New Winner(s):** ${
                            newWinners
                                .map(
                                    id =>
                                        `<@${id}>`
                                )
                                .join(", ")
                        }`
                    ].join("\n")

            });

        }

        // ----------------------------------------------------
        // LOG
        // ----------------------------------------------------

        await logGiveaway(
            interaction.client,
            "🔄 Giveaway Rerolled",
            [
                `**Giveaway:** \`${giveaway.id}\``,
                `**Prize:** ${giveaway.prize}`,
                `**Rerolled By:** <@${interaction.user.id}>`,
                `**New Winner(s):** ${
                    newWinners
                        .map(
                            id =>
                                `<@${id}>`
                        )
                        .join(", ")
                }`
            ].join("\n")
        );

        await interaction.editReply({

            content:
                [
                    "✅ **Giveaway rerolled successfully.**",
                    "",
                    `🎁 Prize: **${giveaway.prize}**`,
                    `🏆 New winner(s): ${newWinners
                        .map(
                            id =>
                                `<@${id}>`
                        )
                        .join(", ")}`
                ].join("\n")

        });

        return giveaway;

    } catch (error) {

        console.error(
            "❌ Reroll giveaway error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Failed to reroll giveaway.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ============================================================
// CANCEL GIVEAWAY
// ============================================================

export async function cancelGiveaway(
    interaction,
    giveawayId
) {

    const deferred =
        await deferEphemeral(
            interaction
        );

    if (!deferred) {
        return false;
    }

    try {

        // ----------------------------------------------------
        // PERMISSION
        // ----------------------------------------------------

        if (
            !await requireGiveawayStaff(
                interaction
            )
        ) {
            return false;
        }

        // ----------------------------------------------------
        // FIND
        // ----------------------------------------------------

        const giveaway =
            giveaways.get(
                giveawayId
            );

        if (!giveaway) {

            await interaction.editReply({
                content:
                    "❌ Giveaway not found."
            });

            return false;
        }

        if (
            giveaway.status !== "active"
        ) {

            await interaction.editReply({
                content:
                    "❌ Only active giveaways can be cancelled."
            });

            return false;
        }

        // ----------------------------------------------------
        // CANCEL
        // ----------------------------------------------------

        giveaway.status =
            "cancelled";

        giveaway.cancelledAt =
            new Date().toISOString();

        giveaway.cancelledBy =
            interaction.user.id;

        giveaways.set(
            giveawayId,
            giveaway
        );

        // ----------------------------------------------------
        // UPDATE MESSAGE
        // ----------------------------------------------------

        await updateGiveawayMessage(
            interaction.client,
            giveaway
        );

        // ----------------------------------------------------
        // SEND CANCEL MESSAGE
        // ----------------------------------------------------

        const channel =
            await interaction.client.channels
                .fetch(
                    giveaway.channelId
                )
                .catch(
                    () => null
                );

        if (
            channel &&
            channel.isTextBased()
        ) {

            await channel.send({

                content:
                    [
                        "❌ **Giveaway Cancelled**",
                        "",
                        `🎁 **Prize:** ${giveaway.prize}`,
                        `🆔 **Giveaway:** \`${giveaway.id}\``,
                        `👤 **Cancelled by:** <@${interaction.user.id}>`
                    ].join("\n")

            });

        }

        // ----------------------------------------------------
        // LOG
        // ----------------------------------------------------

        await logGiveaway(
            interaction.client,
            "❌ Giveaway Cancelled",
            [
                `**Giveaway:** \`${giveaway.id}\``,
                `**Prize:** ${giveaway.prize}`,
                `**Cancelled By:** <@${interaction.user.id}>`,
                `**Entries:** ${giveaway.entries.length}`
            ].join("\n")
        );

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        await interaction.editReply({

            content:
                [
                    "✅ **Giveaway cancelled.**",
                    "",
                    `🎁 Prize: **${giveaway.prize}**`,
                    `🆔 ID: \`${giveaway.id}\``
                ].join("\n")

        });

        return giveaway;

    } catch (error) {

        console.error(
            "❌ Cancel giveaway error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Failed to cancel giveaway.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ============================================================
// GIVEAWAY INTERACTION HANDLER
// ============================================================

export async function handleGiveawayInteraction(
    interaction
) {

    try {

        if (
            !interaction.isButton()
        ) {
            return false;
        }

        const customId =
            interaction.customId || "";

        // ----------------------------------------------------
        // ENTER
        // ----------------------------------------------------

        if (
            customId.startsWith(
                "giveaway_enter:"
            )
        ) {

            const giveawayId =
                customId.split(":")[1];

            return enterGiveaway(
                interaction,
                giveawayId
            );
        }

        return false;

    } catch (error) {

        console.error(
            "❌ Giveaway interaction error:",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {

            await safeReply(
                interaction,
                {
                    content:
                        "❌ Something went wrong with this giveaway.",
                    flags:
                        MessageFlags.Ephemeral
                }
            );

        }

        return false;
    }
}

// ============================================================
// GET GIVEAWAYS
// ============================================================

export function getGiveaways() {

    return [
        ...giveaways.values()
    ].map(
        giveaway => ({
            ...giveaway,

            entries:
                [...giveaway.entries],

            winners:
                [...giveaway.winners]
        })
    );
}

// ============================================================
// GET SINGLE GIVEAWAY
// ============================================================

export function getGiveaway(
    giveawayId
) {

    const giveaway =
        giveaways.get(
            giveawayId
        );

    if (!giveaway) {
        return null;
    }

    return {
        ...giveaway,

        entries:
            [...giveaway.entries],

        winners:
            [...giveaway.winners]
    };
}

// ============================================================
// EXPORTS
// ============================================================

export {
    GIVEAWAY_CHANNEL_ID,
    GIVEAWAY_LOG_CHANNEL_ID,
    STAFF_ROLE_IDS
};