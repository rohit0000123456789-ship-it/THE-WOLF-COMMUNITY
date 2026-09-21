import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    MessageFlags
} from "discord.js";

// ============================================================
// CONFIG
// ============================================================

const APPLICATION_CHANNEL_ID =
    "1532403417383960666";

const APPLICATION_LOG_CHANNEL_ID =
    "1550762498280521829";


// ============================================================
// STAFF ROLES
// ============================================================

const STAFF_ROLE_IDS = [
    "1525599169866109008", // Supreme Wolf Owner
    "1525869619196461076", // Counch
    "1525869695872532582", // Guardian
    "1525869907495878756"  // Moderator
];


// ============================================================
// STORAGE
// ============================================================

const applications = new Map();

let applicationCounter = 0;


// ============================================================
// QUESTIONS
// ============================================================

const APPLICATION_QUESTIONS = {

    staff: [
        {
            id: "name",
            label: "What is your name?",
            placeholder: "Enter your name"
        },
        {
            id: "age",
            label: "How old are you?",
            placeholder: "Enter your age"
        },
        {
            id: "experience",
            label: "Moderation experience?",
            placeholder: "Tell us about your experience"
        },
        {
            id: "availability",
            label: "Daily availability?",
            placeholder: "Example: 4-6 hours"
        },
        {
            id: "why",
            label: "Why should we select you?",
            placeholder: "Tell us why you want to join"
        }
    ],

    partnership: [
        {
            id: "name",
            label: "What is your name?",
            placeholder: "Enter your name"
        },
        {
            id: "experience",
            label: "Partnership experience?",
            placeholder: "Tell us about your experience"
        },
        {
            id: "companies",
            label: "Which companies have you worked with?",
            placeholder: "List companies or communities"
        },
        {
            id: "availability",
            label: "Daily availability?",
            placeholder: "Example: 3-5 hours"
        },
        {
            id: "why",
            label: "Why Partnership Manager?",
            placeholder: "Tell us why you want this role"
        }
    ],

    community: [
        {
            id: "name",
            label: "What is your name?",
            placeholder: "Enter your name"
        },
        {
            id: "experience",
            label: "Discord experience?",
            placeholder: "Tell us about your Discord experience"
        },
        {
            id: "activity",
            label: "How active are you?",
            placeholder: "Tell us your daily activity"
        },
        {
            id: "skills",
            label: "What are your skills?",
            placeholder: "Example: Events, support, moderation"
        },
        {
            id: "why",
            label: "Why join our Community Team?",
            placeholder: "Tell us why you want to join"
        }
    ]

};


// ============================================================
// APPLICATION NAMES
// ============================================================

const APPLICATION_NAMES = {

    staff:
        "🛡️ Staff",

    partnership:
        "🤝 Partnership Manager",

    community:
        "🐺 Community Team"

};


// ============================================================
// CREATE APPLICATION ID
// ============================================================

function createApplicationId() {

    applicationCounter++;

    return (
        "WOLF-APP-" +
        String(applicationCounter)
            .padStart(4, "0")
    );

}


// ============================================================
// STAFF CHECK
// ============================================================

function isApplicationStaff(member) {

    if (!member) {
        return false;
    }

    if (
        member.permissions?.has("Administrator")
    ) {
        return true;
    }

    return STAFF_ROLE_IDS.some(
        roleId =>
            member.roles?.cache?.has(roleId)
    );

}


// ============================================================
// APPLICATION PANEL
// ============================================================

export function createApplicationPanel() {

    const embed =
        new EmbedBuilder()

            .setTitle(
                "🐺 The Wolf Community"
            )

            .setDescription(

                "## 📋 Staff & Team Applications\n\n" +

                "Want to become part of **The Wolf Community team**? " +
                "Select the application you want to submit below.\n\n" +

                "🛡️ **Staff**\n" +
                "Moderation and server management.\n\n" +

                "🤝 **Partnership Manager**\n" +
                "Handle partnerships and collaborations.\n\n" +

                "🐺 **Community Team**\n" +
                "Help members and keep the community active.\n\n" +

                "⚠️ Please provide honest and accurate answers. " +
                "Your application will be reviewed by our staff team."

            )

            .setColor(0xff00a8)

            .setFooter({
                text:
                    "The Wolf Community • Applications"
            });


    const menu =
        new StringSelectMenuBuilder()

            .setCustomId(
                "application_type"
            )

            .setPlaceholder(
                "Select an application"
            )

            .addOptions(

                {
                    label:
                        "Staff",

                    description:
                        "Apply for a Staff position",

                    value:
                        "staff",

                    emoji:
                        "🛡️"
                },

                {
                    label:
                        "Partnership Manager",

                    description:
                        "Apply for Partnership Manager",

                    value:
                        "partnership",

                    emoji:
                        "🤝"
                },

                {
                    label:
                        "Community Team",

                    description:
                        "Apply for Community Team",

                    value:
                        "community",

                    emoji:
                        "🐺"
                }

            );


    return {

        embeds: [
            embed
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(menu)

        ]

    };

}


// ============================================================
// ENSURE APPLICATION PANEL
// ============================================================

export async function ensureApplicationPanel(
    client
) {

    try {

        const channel =
            await client.channels.fetch(
                APPLICATION_CHANNEL_ID
            );


        if (!channel) {

            console.log(
                "❌ Application channel not found."
            );

            return;

        }


        const messages =
            await channel.messages.fetch({
                limit: 50
            });


        const alreadyExists =
            messages.some(
                message =>
                    message.author?.id ===
                    client.user.id &&
                    message.components?.some(
                        row =>
                            row.components?.some(
                                component =>
                                    component.customId ===
                                    "application_type"
                            )
                    )
            );


        if (alreadyExists) {

            console.log(
                "✅ Application panel already exists."
            );

            return;

        }


        await channel.send(
            createApplicationPanel()
        );


        console.log(
            "✅ Application panel created."
        );


    } catch (error) {

        console.error(
            "❌ Application panel error:",
            error
        );

    }

}


// ============================================================
// START APPLICATION
// ============================================================

export async function startApplication(
    interaction,
    applicationType
) {

    const questions =
        APPLICATION_QUESTIONS[
            applicationType
        ];


    if (!questions) {

        return interaction.reply({

            content:
                "❌ Invalid application type.",

            flags:
                MessageFlags.Ephemeral

        });

    }


    // ========================================================
    // CHECK EXISTING APPLICATION
    // ========================================================

    const existing =
        [...applications.values()]
            .find(
                application =>
                    application.userId ===
                    interaction.user.id &&
                    application.status !== "Denied" &&
                    application.status !== "Archived"
            );


    if (existing) {

        return interaction.reply({

            content:
                `⚠️ You already have an active application: \`${existing.id}\``,

            flags:
                MessageFlags.Ephemeral

        });

    }


    // ========================================================
    // CREATE APPLICATION
    // ========================================================

    const applicationId =
        createApplicationId();


    const application = {

        id:
            applicationId,

        userId:
            interaction.user.id,

        username:
            interaction.user.tag,

        type:
            applicationType,

        answers:
            {},

        questionIndex:
            0,

        status:
            "Pending",

        createdAt:
            Date.now()

    };


    applications.set(
        applicationId,
        application
    );


    // ========================================================
    // FIRST QUESTION
    // ========================================================

    return showQuestion(
        interaction,
        application
    );

}


// ============================================================
// SHOW QUESTION
// ============================================================

async function showQuestion(
    interaction,
    application
) {

    const questions =
        APPLICATION_QUESTIONS[
            application.type
        ];


    const question =
        questions[
            application.questionIndex
        ];


    if (!question) {

        return finishApplication(
            interaction,
            application
        );

    }


    const modal =
        new ModalBuilder()

            .setCustomId(
                `application_question:${application.id}:${application.questionIndex}`
            )

            .setTitle(
                `${APPLICATION_NAMES[application.type]} • ${application.questionIndex + 1}/${questions.length}`
            );


    const input =
        new TextInputBuilder()

            .setCustomId(
                "answer"
            )

            .setLabel(
                question.label
            )

            .setPlaceholder(
                question.placeholder
            )

            .setStyle(
                TextInputStyle.Paragraph
            )

            .setRequired(
                true
            )

            .setMaxLength(
                1000
            );


    modal.addComponents(

        new ActionRowBuilder()
            .addComponents(input)

    );


    // ========================================================
    // SHOW MODAL
    // ========================================================

    try {

        return await interaction.showModal(
            modal
        );

    } catch (error) {

        console.error(
            "❌ Show application modal error:",
            error
        );

    }

}


// ============================================================
// HANDLE QUESTION ANSWER
// ============================================================

export async function handleQuestionAnswer(
    interaction,
    applicationId,
    questionIndex
) {

    const application =
        applications.get(
            applicationId
        );


    if (!application) {

        return interaction.reply({

            content:
                "❌ Application not found.",

            flags:
                MessageFlags.Ephemeral

        });

    }


    const index =
        Number(questionIndex);


    const answer =
        interaction.fields.getTextInputValue(
            "answer"
        );


    application.answers[index] =
        answer;


    application.questionIndex =
        index + 1;


    const questions =
        APPLICATION_QUESTIONS[
            application.type
        ];


    // ========================================================
    // MORE QUESTIONS
    // ========================================================

    if (
        application.questionIndex <
        questions.length
    ) {

        const nextButton =
            new ButtonBuilder()

                .setCustomId(
                    `application_next:${application.id}`
                )

                .setLabel(
                    "Continue"
                )

                .setStyle(
                    ButtonStyle.Primary
                );


        return interaction.reply({

            content:
                `✅ Answer saved.\n\n` +
                `Click **Continue** for question ` +
                `${application.questionIndex + 1}/${questions.length}.`,

            components: [

                new ActionRowBuilder()
                    .addComponents(
                        nextButton
                    )

            ],

            flags:
                MessageFlags.Ephemeral

        });

    }


    // ========================================================
    // FINISH
    // ========================================================

    return finishApplication(
        interaction,
        application
    );

}


// ============================================================
// NEXT QUESTION
// ============================================================

export async function continueApplication(
    interaction,
    applicationId
) {

    const application =
        applications.get(
            applicationId
        );


    if (!application) {

        return interaction.reply({

            content:
                "❌ Application not found.",

            flags:
                MessageFlags.Ephemeral

        });

    }


    return showQuestion(
        interaction,
        application
    );

}


// ============================================================
// FINISH APPLICATION
// ============================================================

async function finishApplication(
    interaction,
    application
) {

    application.status =
        "Pending";


    application.completedAt =
        Date.now();


    await sendApplicationToLogs(
        interaction.guild,
        application
    );


    // ========================================================
    // USER RESPONSE
    // ========================================================

    await interaction.reply({

        content:

            "✅ **Application submitted successfully!**\n\n" +

            `🆔 Application ID: \`${application.id}\`\n` +

            "📋 Status: **Pending**\n\n" +

            "Our staff team will review your application. " +
            "You will receive a DM when there is an update.",

        flags:
            MessageFlags.Ephemeral

    });


    // ========================================================
    // DM USER
    // ========================================================

    try {

        await interaction.user.send({

            content:

                `🐺 **The Wolf Community — Application Received**\n\n` +

                `Your **${APPLICATION_NAMES[application.type]}** application has been received.\n\n` +

                `🆔 Application ID: \`${application.id}\`\n` +

                `📋 Status: **Pending**\n\n` +

                "Our team will review it and contact you when there is an update."

        });

    } catch {}

}


// ============================================================
// SEND APPLICATION TO LOGS
// ============================================================

async function sendApplicationToLogs(
    guild,
    application
) {

    try {

        const channel =
            guild.channels.cache.get(
                APPLICATION_LOG_CHANNEL_ID
            );


        if (!channel) {

            console.log(
                "❌ Application log channel not found."
            );

            return;

        }


        const embed =
            new EmbedBuilder()

                .setTitle(
                    `📋 New Application • ${application.id}`
                )

                .addFields(

                    {
                        name:
                            "Applicant",

                        value:
                            `<@${application.userId}>`,

                        inline:
                            true
                    },

                    {
                        name:
                            "Application",

                        value:
                            APPLICATION_NAMES[
                                application.type
                            ],

                        inline:
                            true
                    },

                    {
                        name:
                            "Status",

                        value:
                            "🟡 Pending",

                        inline:
                            true
                    }

                )

                .setTimestamp();


        // ====================================================
        // ANSWERS
        // ====================================================

        const questions =
            APPLICATION_QUESTIONS[
                application.type
            ];


        for (
            let i = 0;
            i < questions.length;
            i++
        ) {

            const question =
                questions[i];


            const answer =
                application.answers[i] ||
                "No answer";


            embed.addFields({

                name:
                    question.label,

                value:
                    answer.substring(
                        0,
                        1024
                    ),

                inline:
                    false

            });

        }


        // ====================================================
        // DECISION BUTTONS
        // ====================================================

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            `application_interview:${application.id}`
                        )

                        .setLabel(
                            "Interview"
                        )

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            `application_accept:${application.id}`
                        )

                        .setLabel(
                            "Accept"
                        )

                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            `application_deny:${application.id}`
                        )

                        .setLabel(
                            "Deny"
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
                row
            ]

        });


    } catch (error) {

        console.error(
            "❌ Application log error:",
            error
        );

    }

}


// ============================================================
// APPLICATION DECISION
// ============================================================

export async function handleApplicationDecision(
    interaction,
    action,
    applicationId
) {

    // ========================================================
    // ACKNOWLEDGE IMMEDIATELY
    // ========================================================

    try {

        await interaction.deferReply({

            flags:
                MessageFlags.Ephemeral

        });

    } catch (error) {

        console.error(
            "❌ Application decision defer error:",
            error
        );

        return;

    }


    try {

        // ======================================================
        // STAFF CHECK
        // ======================================================

        if (
            !isApplicationStaff(
                interaction.member
            )
        ) {

            return interaction.editReply({

                content:
                    "❌ You do not have permission to manage applications."

            });

        }


        const application =
            applications.get(
                applicationId
            );


        if (!application) {

            return interaction.editReply({

                content:
                    "❌ Application not found."

            });

        }


        // ======================================================
        // UPDATE STATUS
        // ======================================================

        let newStatus;


        if (action === "interview") {

            newStatus =
                "Interview";

        }

        else if (
            action === "accept"
        ) {

            newStatus =
                "Accepted";

        }

        else if (
            action === "deny"
        ) {

            newStatus =
                "Denied";

        }

        else {

            return interaction.editReply({

                content:
                    "❌ Invalid application action."

            });

        }


        application.status =
            newStatus;


        application.reviewedBy =
            interaction.user.id;


        application.reviewedAt =
            Date.now();


        // ======================================================
        // UPDATE LOG MESSAGE
        // ======================================================

        try {

            const embed =
                EmbedBuilder.from(
                    interaction.message.embeds[0]
                );


            embed.spliceFields(
                2,
                1,
                {

                    name:
                        "Status",

                    value:

                        newStatus === "Accepted"

                            ? "🟢 Accepted"

                            : newStatus === "Denied"

                                ? "🔴 Denied"

                                : "🔵 Interview",

                    inline:
                        true

                }
            );


            embed.addFields({

                name:
                    "Reviewed By",

                value:
                    `<@${interaction.user.id}>`,

                inline:
                    true

            });


            await interaction.message.edit({

                embeds: [
                    embed
                ],

                components: []

            });

        } catch (error) {

            console.error(
                "❌ Application message update error:",
                error
            );

        }


        // ======================================================
        // DM APPLICANT
        // ======================================================

        try {

            const user =
                await interaction.client.users.fetch(
                    application.userId
                );


            let dmMessage;


            if (
                newStatus === "Accepted"
            ) {

                dmMessage =

                    `🎉 **Congratulations!**\n\n` +

                    `Your application for **${APPLICATION_NAMES[application.type]}** at **The Wolf Community** has been **accepted**.\n\n` +

                    `🆔 Application ID: \`${application.id}\`\n\n` +

                    "A staff member will contact you with the next steps.";

            }

            else if (
                newStatus === "Denied"
            ) {

                dmMessage =

                    `📋 **Application Update**\n\n` +

                    `Your application for **${APPLICATION_NAMES[application.type]}** at **The Wolf Community** has been **denied** at this time.\n\n` +

                    `🆔 Application ID: \`${application.id}\`\n\n` +

                    "Thank you for taking the time to apply.";

            }

            else {

                dmMessage =

                    `📋 **Application Update**\n\n` +

                    `Your application for **${APPLICATION_NAMES[application.type]}** has moved to the **Interview** stage.\n\n` +

                    `🆔 Application ID: \`${application.id}\`\n\n` +

                    "A staff member will contact you regarding the interview.";

            }


            await user.send({
                content:
                    dmMessage
            });


        } catch {}



        // ======================================================
        // RESPONSE
        // ======================================================

        return interaction.editReply({

            content:
                `✅ Application \`${application.id}\` updated to **${newStatus}**.`

        });


    } catch (error) {

        console.error(
            "❌ Application decision error:",
            error
        );


        try {

            return interaction.editReply({

                content:
                    "❌ Failed to update application."

            });

        } catch {}

    }

}


// ============================================================
// MAIN INTERACTION HANDLER
// ============================================================

export async function handleApplicationInteraction(
    interaction
) {

    try {

        // ======================================================
        // SELECT MENU
        // ======================================================

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "application_type"
        ) {

            const type =
                interaction.values[0];


            // IMPORTANT:
            // Acknowledge the select interaction first.
            //
            // Then send the START button.
            // This prevents "didn't respond in time".

            await interaction.deferReply({

                flags:
                    MessageFlags.Ephemeral

            });


            const button =
                new ButtonBuilder()

                    .setCustomId(
                        `application_start:${type}`
                    )

                    .setLabel(
                        `Start ${APPLICATION_NAMES[type]} Application`
                    )

                    .setStyle(
                        ButtonStyle.Primary
                    );


            return interaction.editReply({

                content:

                    `You selected **${APPLICATION_NAMES[type]}**.\n\n` +

                    "Click the button below to begin.",

                components: [

                    new ActionRowBuilder()
                        .addComponents(
                            button
                        )

                ]

            });

        }


        // ======================================================
        // START BUTTON
        // ======================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "application_start:"
            )
        ) {

            const type =
                interaction.customId.split(
                    ":"
                )[1];


            return startApplication(
                interaction,
                type
            );

        }


        // ======================================================
        // NEXT BUTTON
        // ======================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "application_next:"
            )
        ) {

            const applicationId =
                interaction.customId.split(
                    ":"
                )[1];


            return continueApplication(
                interaction,
                applicationId
            );

        }


        // ======================================================
        // QUESTION MODAL
        // ======================================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId.startsWith(
                "application_question:"
            )
        ) {

            const parts =
                interaction.customId.split(
                    ":"
                );


            const applicationId =
                parts[1];


            const questionIndex =
                parts[2];


            return handleQuestionAnswer(

                interaction,

                applicationId,

                questionIndex

            );

        }


        // ======================================================
        // INTERVIEW
        // ======================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "application_interview:"
            )
        ) {

            const applicationId =
                interaction.customId.split(
                    ":"
                )[1];


            return handleApplicationDecision(

                interaction,

                "interview",

                applicationId

            );

        }


        // ======================================================
        // ACCEPT
        // ======================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "application_accept:"
            )
        ) {

            const applicationId =
                interaction.customId.split(
                    ":"
                )[1];


            return handleApplicationDecision(

                interaction,

                "accept",

                applicationId

            );

        }


        // ======================================================
        // DENY
        // ======================================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                "application_deny:"
            )
        ) {

            const applicationId =
                interaction.customId.split(
                    ":"
                )[1];


            return handleApplicationDecision(

                interaction,

                "deny",

                applicationId

            );

        }

    } catch (error) {

        console.error(
            "❌ Application interaction error:",
            error
        );


        // ======================================================
        // SAFE ERROR RESPONSE
        // ======================================================

        try {

            if (
                interaction.deferred
            ) {

                return interaction.editReply({

                    content:
                        "❌ Something went wrong while processing your application."

                });

            }


            if (
                interaction.replied
            ) {

                return interaction.followUp({

                    content:
                        "❌ Something went wrong while processing your application.",

                    flags:
                        MessageFlags.Ephemeral

                });

            }


            return interaction.reply({

                content:
                    "❌ Something went wrong while processing your application.",

                flags:
                    MessageFlags.Ephemeral

            });

        } catch {}

    }

}


// ============================================================
// GET APPLICATIONS
// ============================================================

export function getApplications() {

    return [

        ...applications.values()

    ].map(
        application => ({

            id:
                application.id,

            userId:
                application.userId,

            username:
                application.username,

            type:
                application.type,

            status:
                application.status,

            answers:
                application.answers,

            createdAt:
                application.createdAt,

            completedAt:
                application.completedAt,

            reviewedBy:
                application.reviewedBy,

            reviewedAt:
                application.reviewedAt

        })
    );

}