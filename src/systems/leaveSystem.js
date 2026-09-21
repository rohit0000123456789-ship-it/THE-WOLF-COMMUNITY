import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";

// ======================================================
// CONFIG
// ======================================================

const STAFF_CHAT_CHANNEL_ID =
    "1550762491439620146";

const STAFF_LOG_CHANNEL_ID =
    "1550762493201354823";

// Staff roles allowed to approve/reject leave
const STAFF_ROLE_IDS = [
    "1525599169866109008", // Supreme Wolf Owner
    "1525869619196461076", // Counch
    "1525869695872532582", // Guardian
    "1525869907495878756"  // Moderator
];

// ======================================================
// DATA
// ======================================================

const leaveApplications = new Map();

let leaveCounter = 1;

// ======================================================
// SAFE REPLY
// ======================================================

async function safeReply(interaction, payload) {

    try {

        if (!interaction) {
            return false;
        }

        if (interaction.replied) {

            await interaction.followUp(
                payload
            );

            return true;
        }

        if (interaction.deferred) {

            await interaction.editReply(
                payload
            );

            return true;
        }

        await interaction.reply(
            payload
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Leave safe reply error:",
            error
        );

        return false;
    }
}

// ======================================================
// LEAVE PANEL
// ======================================================

function createLeavePanel() {

    const embed =
        new EmbedBuilder()
            .setColor(0xFF1493)
            .setTitle(
                "🐺 The Wolf Community — Staff Leave"
            )
            .setDescription(
                [
                    "Need some time away from the community?",
                    "",
                    "Staff members can submit a leave / holiday request using the button below.",
                    "",
                    "### 🏖️ Leave Request",
                    "• Select your start date",
                    "• Select your end date",
                    "• Provide a reason",
                    "",
                    "Your request will be reviewed by the authorized staff team.",
                    "",
                    "⚠️ Please submit accurate information."
                ].join("\n")
            )
            .setFooter({
                text:
                    "The Wolf Community • Staff Management"
            })
            .setTimestamp();

    const button =
        new ButtonBuilder()
            .setCustomId(
                "leave_apply"
            )
            .setLabel(
                "Apply for Leave"
            )
            .setEmoji("🏖️")
            .setStyle(
                ButtonStyle.Primary
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                button
            );

    return {
        embeds: [embed],
        components: [row]
    };
}

// ======================================================
// ENSURE LEAVE PANEL
// ======================================================

export async function ensureLeavePanel(
    client
) {

    try {

        const channel =
            await client.channels.fetch(
                STAFF_CHAT_CHANNEL_ID
            );

        if (!channel) {

            console.log(
                "❌ Staff Chat channel not found."
            );

            return;
        }

        if (!channel.isTextBased()) {

            console.log(
                "❌ Staff Chat is not a text channel."
            );

            return;
        }

        const messages =
            await channel.messages.fetch({
                limit: 50
            });

        const existing =
            messages.find(
                message =>
                    message.author?.id ===
                        client.user?.id &&
                    message.components?.some(
                        row =>
                            row.components?.some(
                                component =>
                                    component.customId ===
                                    "leave_apply"
                            )
                    )
            );

        if (existing) {

            console.log(
                "🏖️ Leave panel already exists."
            );

            return;
        }

        await channel.send(
            createLeavePanel()
        );

        console.log(
            "🏖️ Staff leave panel sent."
        );

    } catch (error) {

        console.error(
            "❌ Failed to create leave panel:",
            error
        );

    }
}

// ======================================================
// STAFF PERMISSION
// ======================================================

function isStaff(interaction) {

    if (!interaction.member) {
        return false;
    }

    // Administrator also allowed
    if (
        interaction.member.permissions?.has(
            "Administrator"
        )
    ) {
        return true;
    }

    if (
        !interaction.member.roles?.cache
    ) {
        return false;
    }

    return STAFF_ROLE_IDS.some(
        roleId =>
            interaction.member.roles.cache.has(
                roleId
            )
    );
}

// ======================================================
// CHECK ACTIVE APPLICATION
// ======================================================

function getActiveLeave(
    userId
) {

    return [
        ...leaveApplications.values()
    ].find(
        application =>
            application.userId === userId &&
            application.status === "Pending"
    );
}

// ======================================================
// START LEAVE APPLICATION
// ======================================================

async function startLeaveApplication(
    interaction
) {

    try {

        const existing =
            getActiveLeave(
                interaction.user.id
            );

        if (existing) {

            return safeReply(
                interaction,
                {
                    content:
                        `❌ You already have a pending leave request.\n\n` +
                        `Leave ID: **${existing.id}**`,
                    flags:
                        MessageFlags.Ephemeral
                }
            );

        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "leave_application_modal"
                )
                .setTitle(
                    "Staff Leave Request"
                );

        const startDate =
            new TextInputBuilder()
                .setCustomId(
                    "leave_start"
                )
                .setLabel(
                    "Start date"
                )
                .setPlaceholder(
                    "Example: 25/09/2026"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(20);

        const endDate =
            new TextInputBuilder()
                .setCustomId(
                    "leave_end"
                )
                .setLabel(
                    "End date"
                )
                .setPlaceholder(
                    "Example: 30/09/2026"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(20);

        const reason =
            new TextInputBuilder()
                .setCustomId(
                    "leave_reason"
                )
                .setLabel(
                    "Reason for leave"
                )
                .setPlaceholder(
                    "Explain why you need leave"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        const contact =
            new TextInputBuilder()
                .setCustomId(
                    "leave_contact"
                )
                .setLabel(
                    "Availability during leave"
                )
                .setPlaceholder(
                    "Example: Available for urgent matters"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(200);

        modal.addComponents(

            new ActionRowBuilder()
                .addComponents(
                    startDate
                ),

            new ActionRowBuilder()
                .addComponents(
                    endDate
                ),

            new ActionRowBuilder()
                .addComponents(
                    reason
                ),

            new ActionRowBuilder()
                .addComponents(
                    contact
                )

        );

        await interaction.showModal(
            modal
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Start leave application error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Could not open the leave request form.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ======================================================
// SUBMIT LEAVE APPLICATION
// ======================================================

async function submitLeaveApplication(
    interaction
) {

    try {

        // IMPORTANT:
        // Acknowledge modal immediately
        if (
            !interaction.deferred &&
            !interaction.replied
        ) {

            await interaction.deferReply({
                flags:
                    MessageFlags.Ephemeral
            });

        }

        const existing =
            getActiveLeave(
                interaction.user.id
            );

        if (existing) {

            return interaction.editReply({
                content:
                    `❌ You already have a pending leave request.\n\n` +
                    `Leave ID: **${existing.id}**`
            });
        }

        const startDate =
            interaction.fields.getTextInputValue(
                "leave_start"
            );

        const endDate =
            interaction.fields.getTextInputValue(
                "leave_end"
            );

        const reason =
            interaction.fields.getTextInputValue(
                "leave_reason"
            );

        let contact = "";

        try {

            contact =
                interaction.fields.getTextInputValue(
                    "leave_contact"
                );

        } catch {

            contact = "";
        }

        const leaveId =
            `WOLF-LEAVE-${String(
                leaveCounter
            ).padStart(4, "0")}`;

        leaveCounter++;

        const application = {

            id:
                leaveId,

            userId:
                interaction.user.id,

            username:
                interaction.user.tag,

            startDate,

            endDate,

            reason,

            contact,

            status:
                "Pending",

            createdAt:
                Date.now(),

            reviewedBy:
                null,

            reviewedAt:
                null
        };

        leaveApplications.set(
            leaveId,
            application
        );

        await sendLeaveToLogs(
            interaction.client,
            application
        );

        await interaction.editReply({

            content:
                `🏖️ **Leave Request Submitted!**\n\n` +
                `Leave ID: **${leaveId}**\n` +
                `Start: **${startDate}**\n` +
                `End: **${endDate}**\n` +
                `Status: **🟡 Pending**\n\n` +
                `Your request has been sent to the staff management team.`

        });

        // ==================================================
        // DM APPLICANT
        // ==================================================

        try {

            await interaction.user.send(

                `🐺 **The Wolf Community — Leave Request**\n\n` +
                `Your leave request has been submitted successfully.\n\n` +
                `**Leave ID:** ${leaveId}\n` +
                `**Start:** ${startDate}\n` +
                `**End:** ${endDate}\n` +
                `**Status:** 🟡 Pending\n\n` +
                `You will receive another DM when your request is reviewed.`

            );

        } catch {

            console.log(
                `⚠️ Could not DM ${interaction.user.tag}.`
            );

        }

        return true;

    } catch (error) {

        console.error(
            "❌ Submit leave application error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Something went wrong while submitting your leave request.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ======================================================
// SEND LEAVE TO STAFF LOGS
// ======================================================

async function sendLeaveToLogs(
    client,
    application
) {

    try {

        const channel =
            await client.channels.fetch(
                STAFF_LOG_CHANNEL_ID
            );

        if (
            !channel ||
            !channel.isTextBased()
        ) {

            console.error(
                "❌ Staff log channel not found."
            );

            return;
        }

        const embed =
            new EmbedBuilder()
                .setColor(0xFF1493)
                .setTitle(
                    "🏖️ New Staff Leave Request"
                )
                .setDescription(
                    [
                        `**Leave ID:** ${application.id}`,
                        `**Staff Member:** <@${application.userId}>`,
                        `**Username:** ${application.username}`,
                        "",
                        `**Start Date:** ${application.startDate}`,
                        `**End Date:** ${application.endDate}`,
                        `**Status:** 🟡 Pending`
                    ].join("\n")
                )
                .addFields(

                    {
                        name:
                            "📝 Reason",
                        value:
                            application.reason
                                .substring(0, 1024)
                    },

                    {
                        name:
                            "📞 Availability During Leave",
                        value:
                            application.contact ||
                            "Not provided"
                    }

                )
                .setFooter({
                    text:
                        "The Wolf Community • Staff Leave"
                })
                .setTimestamp();

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `leave_approve:${application.id}`
                        )
                        .setLabel(
                            "Approve"
                        )
                        .setEmoji(
                            "✅"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `leave_reject:${application.id}`
                        )
                        .setLabel(
                            "Reject"
                        )
                        .setEmoji(
                            "❌"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        )

                );

        await channel.send({

            embeds: [
                embed
            ],

            components: [
                buttons
            ]

        });

    } catch (error) {

        console.error(
            "❌ Failed to send leave request to logs:",
            error
        );

    }
}

// ======================================================
// HANDLE LEAVE DECISION
// ======================================================

async function handleLeaveDecision(
    interaction,
    action,
    leaveId
) {

    try {

        // --------------------------------------------------
        // ACKNOWLEDGE FIRST
        // --------------------------------------------------

        if (
            !interaction.deferred &&
            !interaction.replied
        ) {

            await interaction.deferReply({
                flags:
                    MessageFlags.Ephemeral
            });

        }

        if (
            !isStaff(interaction)
        ) {

            return interaction.editReply({
                content:
                    "❌ You do not have permission to manage staff leave requests."
            });

        }

        const application =
            leaveApplications.get(
                leaveId
            );

        if (!application) {

            return interaction.editReply({
                content:
                    "❌ Leave request not found."
            });

        }

        if (
            application.status !==
            "Pending"
        ) {

            return interaction.editReply({
                content:
                    `❌ This request has already been processed.\n\n` +
                    `Current status: **${application.status}**`
            });

        }

        let status;
        let color;
        let applicantMessage;

        if (
            action === "approve"
        ) {

            status =
                "Approved";

            color =
                0x2ECC71;

            applicantMessage =
                "✅ Your staff leave request has been **approved**.";

        } else if (
            action === "reject"
        ) {

            status =
                "Rejected";

            color =
                0xE74C3C;

            applicantMessage =
                "❌ Your staff leave request has been **rejected**.";

        } else {

            return interaction.editReply({
                content:
                    "❌ Invalid leave action."
            });

        }

        application.status =
            status;

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        // --------------------------------------------------
        // UPDATE ORIGINAL LOG MESSAGE
        // --------------------------------------------------

        const oldEmbed =
            interaction.message?.embeds?.[0];

        let updatedEmbed;

        if (oldEmbed) {

            updatedEmbed =
                EmbedBuilder.from(
                    oldEmbed
                )
                    .setColor(
                        color
                    )
                    .setDescription(
                        [
                            `**Leave ID:** ${application.id}`,
                            `**Staff Member:** <@${application.userId}>`,
                            `**Username:** ${application.username}`,
                            "",
                            `**Start Date:** ${application.startDate}`,
                            `**End Date:** ${application.endDate}`,
                            `**Status:** ${status}`,
                            "",
                            `**Reviewed By:** <@${interaction.user.id}>`
                        ].join("\n")
                    )
                    .setFooter({
                        text:
                            `Reviewed by ${interaction.user.tag}`
                    });

        }

        // --------------------------------------------------
        // EDIT MESSAGE
        // --------------------------------------------------

        try {

            await interaction.message.edit({

                embeds:
                    updatedEmbed
                        ? [updatedEmbed]
                        : [],

                components: []

            });

        } catch (error) {

            console.error(
                "⚠️ Failed to update leave log message:",
                error
            );

        }

        // --------------------------------------------------
        // DM APPLICANT
        // --------------------------------------------------

        try {

            const user =
                await interaction.client.users.fetch(
                    application.userId
                );

            await user.send(

                `🐺 **The Wolf Community — Leave Update**\n\n` +
                `**Leave ID:** ${application.id}\n` +
                `**Start:** ${application.startDate}\n` +
                `**End:** ${application.endDate}\n\n` +
                `${applicantMessage}\n\n` +
                `**Status:** ${status}\n` +
                `**Reviewed by:** ${interaction.user.tag}`

            );

        } catch {

            console.log(
                `⚠️ Could not DM leave applicant ${application.username}.`
            );

        }

        return interaction.editReply({

            content:
                `✅ Leave request **${status.toLowerCase()}** successfully.`

        });

    } catch (error) {

        console.error(
            "❌ Leave decision error:",
            error
        );

        return safeReply(
            interaction,
            {
                content:
                    "❌ Something went wrong while processing the leave request.",
                flags:
                    MessageFlags.Ephemeral
            }
        );
    }
}

// ======================================================
// MAIN INTERACTION HANDLER
// ======================================================

export async function handleLeaveInteraction(
    interaction
) {

    try {

        // ==================================================
        // APPLY BUTTON
        // ==================================================

        if (
            interaction.isButton() &&
            interaction.customId ===
                "leave_apply"
        ) {

            return await startLeaveApplication(
                interaction
            );
        }

        // ==================================================
        // LEAVE MODAL
        // ==================================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId ===
                "leave_application_modal"
        ) {

            return await submitLeaveApplication(
                interaction
            );
        }

        // ==================================================
        // APPROVE
        // ==================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "leave_approve:"
            )
        ) {

            const leaveId =
                interaction.customId
                    .split(":")
                    .slice(1)
                    .join(":");

            return await handleLeaveDecision(
                interaction,
                "approve",
                leaveId
            );
        }

        // ==================================================
        // REJECT
        // ==================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "leave_reject:"
            )
        ) {

            const leaveId =
                interaction.customId
                    .split(":")
                    .slice(1)
                    .join(":");

            return await handleLeaveDecision(
                interaction,
                "reject",
                leaveId
            );
        }

        // ==================================================
        // NOT OUR INTERACTION
        // ==================================================

        return false;

    } catch (error) {

        console.error(
            "❌ Leave interaction error:",
            error
        );

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({

                content:
                    "❌ Something went wrong while processing the leave request.",

                flags:
                    MessageFlags.Ephemeral

            }).catch(() => {});

        }

        return true;
    }
}

// ======================================================
// GET LEAVE APPLICATIONS
// ======================================================

export function getLeaveApplications() {

    return [
        ...leaveApplications.values()
    ];

}