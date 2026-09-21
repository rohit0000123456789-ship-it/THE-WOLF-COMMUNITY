import {
    EmbedBuilder,
    PermissionFlagsBits
} from "discord.js";

// ==========================================
// CONFIG
// ==========================================

const MOD_LOG_CHANNEL_ID =
    "1550776048252100708";

const STAFF_ROLE_IDS = [
    "1525599169866109008", // Supreme Wolf Owner
    "1525869619196461076", // Counch
    "1525869695872532582", // Guardian
    "1525869907495878756"  // Moderator
];

// ==========================================
// CASE STORAGE
// ==========================================

let caseNumber = 0;

const moderationCases = new Map();

// ==========================================
// CASE ID
// ==========================================

function generateCaseId() {

    caseNumber++;

    return `WOLF-${String(caseNumber).padStart(6, "0")}`;
}

// ==========================================
// STAFF CHECK
// ==========================================

function isModerationStaff(member) {

    if (!member) {
        return false;
    }

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    return STAFF_ROLE_IDS.some(
        roleId =>
            member.roles.cache.has(roleId)
    );
}

// ==========================================
// LOG MODERATION ACTION
// ==========================================

async function logModerationAction(
    guild,
    {
        action,
        target,
        moderator,
        reason,
        caseId,
        duration = null
    }
) {

    try {

        const logChannel =
            guild.channels.cache.get(
                MOD_LOG_CHANNEL_ID
            );

        if (
            !logChannel ||
            !logChannel.isTextBased()
        ) {

            console.log(
                "⚠️ Mod log channel not found."
            );

            return;
        }

        const embed =
            new EmbedBuilder()
                .setTitle(
                    `🛡️ Moderation Action — ${action}`
                )
                .addFields(
                    {
                        name: "🆔 Case ID",
                        value: `\`${caseId}\``,
                        inline: true
                    },
                    {
                        name: "👤 Target",
                        value:
                            target
                                ? `<@${target.id}>`
                                : "Unknown",
                        inline: true
                    },
                    {
                        name: "👮 Moderator",
                        value:
                            moderator
                                ? `<@${moderator.id}>`
                                : "Unknown",
                        inline: true
                    },
                    {
                        name: "📝 Reason",
                        value:
                            reason ||
                            "No reason provided"
                    }
                )
                .setTimestamp();

        if (duration) {

            embed.addFields({
                name: "⏱️ Duration",
                value: duration,
                inline: true
            });
        }

        await logChannel.send({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "❌ Moderation log error:",
            error
        );
    }
}

// ==========================================
// SAVE CASE
// ==========================================

function saveCase(data) {

    moderationCases.set(
        data.caseId,
        data
    );

    return data;
}

// ==========================================
// WARN
// ==========================================

async function warnMember(
    interaction,
    target,
    reason
) {

    if (
        !isModerationStaff(
            interaction.member
        )
    ) {

        return interaction.reply({
            content:
                "❌ You do not have permission to use moderation.",
            flags: 64
        });
    }

    const caseId =
        generateCaseId();

    const data = {

        caseId,

        action: "WARN",

        targetId: target.id,

        targetTag: target.user.tag,

        moderatorId:
            interaction.user.id,

        moderatorTag:
            interaction.user.tag,

        reason:
            reason ||
            "No reason provided",

        timestamp:
            new Date().toISOString()
    };

    saveCase(data);

    await logModerationAction(
        interaction.guild,
        {
            action: "⚠️ WARN",
            target: target.user,
            moderator:
                interaction.user,
            reason: data.reason,
            caseId
        }
    );

    await interaction.reply({
        content:
            `⚠️ **${target.user.tag}** has been warned.\n` +
            `Case ID: \`${caseId}\`\n` +
            `Reason: ${data.reason}`
    });
}

// ==========================================
// TIMEOUT
// ==========================================

async function timeoutMember(
    interaction,
    target,
    duration,
    reason
) {

    if (
        !isModerationStaff(
            interaction.member
        )
    ) {

        return interaction.reply({
            content:
                "❌ You do not have permission to use moderation.",
            flags: 64
        });
    }

    if (!target.moderatable) {

        return interaction.reply({
            content:
                "❌ I cannot timeout this member.",
            flags: 64
        });
    }

    const caseId =
        generateCaseId();

    const milliseconds =
        duration * 60 * 1000;

    try {

        await target.timeout(
            milliseconds,
            reason ||
                "No reason provided"
        );

        const data = {

            caseId,

            action: "TIMEOUT",

            targetId: target.id,

            targetTag:
                target.user.tag,

            moderatorId:
                interaction.user.id,

            moderatorTag:
                interaction.user.tag,

            reason:
                reason ||
                "No reason provided",

            duration:

                `${duration} minute(s)`,

            timestamp:
                new Date().toISOString()
        };

        saveCase(data);

        await logModerationAction(
            interaction.guild,
            {
                action: "⏱️ TIMEOUT",
                target: target.user,
                moderator:
                    interaction.user,
                reason:
                    data.reason,
                caseId,
                duration:
                    data.duration
            }
        );

        await interaction.reply({
            content:
                `⏱️ **${target.user.tag}** has been timed out for **${duration} minute(s)**.\n` +
                `Case ID: \`${caseId}\``
        });

    } catch (error) {

        console.error(
            "❌ Timeout error:",
            error
        );

        await interaction.reply({
            content:
                "❌ Failed to timeout this member.",
            flags: 64
        });
    }
}

// ==========================================
// KICK
// ==========================================

async function kickMember(
    interaction,
    target,
    reason
) {

    if (
        !isModerationStaff(
            interaction.member
        )
    ) {

        return interaction.reply({
            content:
                "❌ You do not have permission to use moderation.",
            flags: 64
        });
    }

    if (!target.kickable) {

        return interaction.reply({
            content:
                "❌ I cannot kick this member.",
            flags: 64
        });
    }

    const caseId =
        generateCaseId();

    try {

        await target.kick(
            reason ||
                "No reason provided"
        );

        const data = {

            caseId,

            action: "KICK",

            targetId: target.id,

            targetTag:
                target.user.tag,

            moderatorId:
                interaction.user.id,

            moderatorTag:
                interaction.user.tag,

            reason:
                reason ||
                "No reason provided",

            timestamp:
                new Date().toISOString()
        };

        saveCase(data);

        await logModerationAction(
            interaction.guild,
            {
                action: "👢 KICK",
                target: target.user,
                moderator:
                    interaction.user,
                reason:
                    data.reason,
                caseId
            }
        );

        await interaction.reply({
            content:
                `👢 **${target.user.tag}** has been kicked.\n` +
                `Case ID: \`${caseId}\``
        });

    } catch (error) {

        console.error(
            "❌ Kick error:",
            error
        );

        await interaction.reply({
            content:
                "❌ Failed to kick this member.",
            flags: 64
        });
    }
}

// ==========================================
// BAN
// ==========================================

async function banMember(
    interaction,
    target,
    reason
) {

    if (
        !isModerationStaff(
            interaction.member
        )
    ) {

        return interaction.reply({
            content:
                "❌ You do not have permission to use moderation.",
            flags: 64
        });
    }

    if (!target.bannable) {

        return interaction.reply({
            content:
                "❌ I cannot ban this member.",
            flags: 64
        });
    }

    const caseId =
        generateCaseId();

    try {

        await target.ban({
            reason:
                reason ||
                "No reason provided"
        });

        const data = {

            caseId,

            action: "BAN",

            targetId: target.id,

            targetTag:
                target.user.tag,

            moderatorId:
                interaction.user.id,

            moderatorTag:
                interaction.user.tag,

            reason:
                reason ||
                "No reason provided",

            timestamp:
                new Date().toISOString()
        };

        saveCase(data);

        await logModerationAction(
            interaction.guild,
            {
                action: "🔨 BAN",
                target: target.user,
                moderator:
                    interaction.user,
                reason:
                    data.reason,
                caseId
            }
        );

        await interaction.reply({
            content:
                `🔨 **${target.user.tag}** has been banned.\n` +
                `Case ID: \`${caseId}\``
        });

    } catch (error) {

        console.error(
            "❌ Ban error:",
            error
        );

        await interaction.reply({
            content:
                "❌ Failed to ban this member.",
            flags: 64
        });
    }
}

// ==========================================
// UNBAN
// ==========================================

async function unbanMember(
    interaction,
    userId,
    reason
) {

    if (
        !isModerationStaff(
            interaction.member
        )
    ) {

        return interaction.reply({
            content:
                "❌ You do not have permission to use moderation.",
            flags: 64
        });
    }

    const caseId =
        generateCaseId();

    try {

        const user =
            await interaction.client.users.fetch(
                userId
            );

        await interaction.guild.members.unban(
            user.id,
            reason ||
                "No reason provided"
        );

        const data = {

            caseId,

            action: "UNBAN",

            targetId: user.id,

            targetTag:
                user.tag,

            moderatorId:
                interaction.user.id,

            moderatorTag:
                interaction.user.tag,

            reason:
                reason ||
                "No reason provided",

            timestamp:
                new Date().toISOString()
        };

        saveCase(data);

        await logModerationAction(
            interaction.guild,
            {
                action: "🔓 UNBAN",
                target: user,
                moderator:
                    interaction.user,
                reason:
                    data.reason,
                caseId
            }
        );

        await interaction.reply({
            content:
                `🔓 **${user.tag}** has been unbanned.\n` +
                `Case ID: \`${caseId}\``
        });

    } catch (error) {

        console.error(
            "❌ Unban error:",
            error
        );

        await interaction.reply({
            content:
                "❌ Failed to unban this user.",
            flags: 64
        });
    }
}

// ==========================================
// PURGE
// ==========================================

async function purgeMessages(
    interaction,
    amount
) {

    if (
        !isModerationStaff(
            interaction.member
        )
    ) {

        return interaction.reply({
            content:
                "❌ You do not have permission to use moderation.",
            flags: 64
        });
    }

    if (
        !interaction.channel ||
        !interaction.channel.isTextBased()
    ) {

        return interaction.reply({
            content:
                "❌ This command can only be used in a text channel.",
            flags: 64
        });
    }

    const number =
        Number(amount);

    if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 100
    ) {

        return interaction.reply({
            content:
                "❌ Purge amount must be between **1 and 100**.",
            flags: 64
        });
    }

    try {

        const messages =
            await interaction.channel.bulkDelete(
                number,
                true
            );

        const caseId =
            generateCaseId();

        const data = {

            caseId,

            action: "PURGE",

            targetId: interaction.user.id,

            targetTag:
                interaction.user.tag,

            moderatorId:
                interaction.user.id,

            moderatorTag:
                interaction.user.tag,

            reason:
                `${messages.size} messages deleted`,

            timestamp:
                new Date().toISOString()
        };

        saveCase(data);

        await logModerationAction(
            interaction.guild,
            {
                action: "🧹 PURGE",
                target: interaction.user,
                moderator:
                    interaction.user,
                reason:
                    `${messages.size} messages deleted`,
                caseId
            }
        );

        await interaction.reply({
            content:
                `🧹 Deleted **${messages.size} messages**.\n` +
                `Case ID: \`${caseId}\``,
            flags: 64
        });

    } catch (error) {

        console.error(
            "❌ Purge error:",
            error
        );

        await interaction.reply({
            content:
                "❌ Failed to delete messages.",
            flags: 64
        });
    }
}

// ==========================================
// GET CASES
// ==========================================

function getModerationCases() {

    return Array.from(
        moderationCases.values()
    );
}

// ==========================================
// GET CASE
// ==========================================

function getModerationCase(
    caseId
) {

    return moderationCases.get(
        caseId
    );
}

// ==========================================
// EXPORT
// ==========================================

export {
    warnMember,
    timeoutMember,
    kickMember,
    banMember,
    unbanMember,
    purgeMessages,
    isModerationStaff,
    getModerationCases,
    getModerationCase
};