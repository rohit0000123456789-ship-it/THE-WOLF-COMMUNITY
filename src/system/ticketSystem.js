// src/systems/ticketSystem.js

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

// ============================================================
// CONFIG
// ============================================================

const SUPPORT_CHANNEL_ID = "1525564596956561608";
const TICKET_LOG_CHANNEL_ID = "1550762495721865277";

const STAFF_ROLE_IDS = [
  "1525599169866109008", // Supreme Wolf Owner
  "1525869619196461076", // Counch
  "1525869695872532582", // Guardian
  "1525869907495878756", // Moderator
];

// ============================================================
// TICKET TYPES
// ============================================================

const TICKET_TYPES = {
  general: {
    name: "General Support",
    emoji: "🎫",
    description: "Get help with general questions or issues.",
  },

  partnership: {
    name: "Partnership",
    emoji: "🤝",
    description: "Contact the team regarding partnerships.",
  },

  giveaway: {
    name: "Giveaway Claim",
    emoji: "🎁",
    description: "Claim a giveaway prize or ask about a giveaway.",
  },
};

// ============================================================
// MEMORY STORE
// ============================================================

const tickets = new Map();

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
    console.error("❌ Ticket safeReply error:", error);
    return false;
  }
}

// ============================================================
// STAFF CHECK
// ============================================================

function isStaffMember(member) {
  if (!member) {
    return false;
  }

  if (
    member.permissions &&
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  if (member.roles?.cache) {
    return STAFF_ROLE_IDS.some((roleId) =>
      member.roles.cache.has(roleId)
    );
  }

  return false;
}

// ============================================================
// STAFF PERMISSION CHECK
// ============================================================

function requireStaff(interaction) {
  return isStaffMember(interaction.member);
}

// ============================================================
// TICKET PANEL
// ============================================================

function createTicketPanel() {
  const embed = new EmbedBuilder()
    .setColor(0xff00a8)
    .setTitle("🐺 The Wolf Community — Support")
    .setDescription(
      [
        "Need help? Open a private ticket below.",
        "",
        "🎫 **General Support**",
        "For general questions and support.",
        "",
        "🤝 **Partnership**",
        "For partnership and business inquiries.",
        "",
        "🎁 **Giveaway Claim**",
        "For claiming giveaway prizes.",
        "",
        "🔒 Your ticket will only be visible to you and the staff team.",
      ].join("\n")
    )
    .setFooter({
      text: "The Wolf Community",
    });

  const generalButton = new ButtonBuilder()
    .setCustomId("ticket_create:general")
    .setLabel("General Support")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const partnershipButton = new ButtonBuilder()
    .setCustomId("ticket_create:partnership")
    .setLabel("Partnership")
    .setEmoji("🤝")
    .setStyle(ButtonStyle.Secondary);

  const giveawayButton = new ButtonBuilder()
    .setCustomId("ticket_create:giveaway")
    .setLabel("Giveaway Claim")
    .setEmoji("🎁")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(
    generalButton,
    partnershipButton,
    giveawayButton
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

// ============================================================
// ENSURE SUPPORT PANEL
// ============================================================

async function ensureTicketPanel(client) {
  try {
    const channel = await client.channels
      .fetch(SUPPORT_CHANNEL_ID)
      .catch(() => null);

    if (!channel || !channel.isTextBased()) {
      console.error(
        `❌ Support channel not found: ${SUPPORT_CHANNEL_ID}`
      );
      return;
    }

    const messages = await channel.messages
      .fetch({ limit: 50 })
      .catch(() => null);

    if (!messages) {
      return;
    }

    const existingPanel = messages.find((message) => {
      return (
        message.author?.id === client.user?.id &&
        message.components?.some((row) =>
          row.components?.some((component) =>
            component.customId?.startsWith("ticket_create:")
          )
        )
      );
    });

    if (existingPanel) {
      console.log("✅ Ticket panel already exists.");
      return;
    }

    await channel.send(createTicketPanel());

    console.log("✅ Ticket panel created.");
  } catch (error) {
    console.error("❌ ensureTicketPanel error:", error);
  }
}

// ============================================================
// FIND EXISTING TICKET
// ============================================================

async function findExistingTicket(guild, userId) {
  try {
    const channels = guild.channels.cache;

    for (const channel of channels.values()) {
      if (channel.type !== ChannelType.GuildText) {
        continue;
      }

      if (!channel.topic) {
        continue;
      }

      if (channel.topic.includes(`Ticket Owner: ${userId}`)) {
        return channel;
      }
    }

    return null;
  } catch (error) {
    console.error("❌ findExistingTicket error:", error);
    return null;
  }
}

// ============================================================
// CREATE TICKET
// ============================================================

async function createTicket(interaction, type) {
  try {
    const ticketType = TICKET_TYPES[type];

    if (!ticketType) {
      return safeReply(interaction, {
        content: "❌ Invalid ticket type.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });
    }

    const guild = interaction.guild;

    if (!guild) {
      return safeReply(interaction, {
        content:
          "❌ This ticket can only be created inside a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.user;

    const existingTicket = await findExistingTicket(
      guild,
      user.id
    );

    if (existingTicket) {
      return safeReply(interaction, {
        content:
          `❌ You already have an open ticket: ${existingTicket}`,
      });
    }

    const safeUsername =
      user.username
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 20) || "user";

    const channelName = `${type}-${safeUsername}`;

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionFlagsBits.ViewChannel,
        ],
      },

      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    for (const roleId of STAFF_ROLE_IDS) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,

      topic: `Ticket Owner: ${user.id} | Type: ${type}`,

      permissionOverwrites,

      reason: `Wolf ticket created by ${user.tag}`,
    });

    const ticketData = {
      channelId: channel.id,
      guildId: guild.id,
      userId: user.id,
      username: user.username,
      type,
      typeName: ticketType.name,
      status: "open",
      createdAt: Date.now(),
      claimedBy: null,
      claimedAt: null,
      closedBy: null,
      closedAt: null,
      closeReason: null,
    };

    tickets.set(channel.id, ticketData);

    const ticketEmbed = new EmbedBuilder()
      .setColor(0xff00a8)
      .setTitle(
        `${ticketType.emoji} ${ticketType.name}`
      )
      .setDescription(
        [
          `Welcome <@${user.id}>!`,
          "",
          ticketType.description,
          "",
          "A member of the staff team will assist you shortly.",
          "",
          "🛡️ **Staff:** Use **Claim Ticket** when you start handling this ticket.",
          "🔒 **Close Ticket:** The ticket owner or authorized staff can close it.",
        ].join("\n")
      )
      .addFields(
        {
          name: "Ticket Owner",
          value: `<@${user.id}>`,
          inline: true,
        },
        {
          name: "Status",
          value: "🟢 Open",
          inline: true,
        }
      )
      .setFooter({
        text: "The Wolf Community",
      })
      .setTimestamp();

    const claimButton = new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim Ticket")
      .setEmoji("🛡️")
      .setStyle(ButtonStyle.Primary);

    const closeButton = new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      claimButton,
      closeButton
    );

    await channel.send({
      content: `<@${user.id}>`,
      embeds: [ticketEmbed],
      components: [row],
    });

    await logTicket(
      interaction.client,
      guild,
      "🎫 Ticket Created",
      [
        `**User:** <@${user.id}>`,
        `**Type:** ${ticketType.name}`,
        `**Channel:** ${channel}`,
      ].join("\n")
    );

    await interaction.editReply({
      content:
        `✅ Your ticket has been created: ${channel}`,
    });

    console.log(
      `🎫 Ticket created: ${channel.name} by ${user.tag}`
    );

    return true;
  } catch (error) {
    console.error("❌ Create ticket error:", error);

    await safeReply(interaction, {
      content:
        "❌ I couldn't create your ticket. Please contact the staff team.",
    });

    return true;
  }
}

// ============================================================
// CLAIM TICKET
// ============================================================

async function claimTicket(interaction) {
  try {
    if (!requireStaff(interaction)) {
      return safeReply(interaction, {
        content:
          "❌ Only staff members can claim tickets.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = tickets.get(
      interaction.channelId
    );

    if (!ticket) {
      return safeReply(interaction, {
        content:
          "❌ This channel is not a registered ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status !== "open") {
      return safeReply(interaction, {
        content:
          "❌ This ticket is not open.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.claimedBy) {
      return safeReply(interaction, {
        content:
          `⚠️ This ticket is already claimed by <@${ticket.claimedBy}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    ticket.claimedBy =
      interaction.user.id;

    ticket.claimedAt =
      Date.now();

    tickets.set(
      interaction.channelId,
      ticket
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("🛡️ Ticket Claimed")
      .setDescription(
        `<@${interaction.user.id}> is now handling this ticket.`
      )
      .setTimestamp();

    await interaction.channel.send({
      embeds: [embed],
    });

    await logTicket(
      interaction.client,
      interaction.guild,
      "🛡️ Ticket Claimed",
      `**Staff:** <@${interaction.user.id}>\n**Channel:** ${interaction.channel}`
    );

    return safeReply(interaction, {
      content:
        "✅ You have claimed this ticket.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("❌ Claim ticket error:", error);

    return safeReply(interaction, {
      content:
        "❌ Failed to claim the ticket.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ============================================================
// CLOSE TICKET BUTTON
// ============================================================

async function requestTicketClose(interaction) {
  try {
    const ticket = tickets.get(
      interaction.channelId
    );

    if (!ticket) {
      return safeReply(interaction, {
        content:
          "❌ This is not a registered ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const isOwner =
      ticket.userId ===
      interaction.user.id;

    const isStaff =
      isStaffMember(interaction.member);

    if (!isOwner && !isStaff) {
      return safeReply(interaction, {
        content:
          "❌ Only the ticket owner or authorized staff can close this ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status === "closed") {
      return safeReply(interaction, {
        content:
          "⚠️ This ticket is already closed.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(
        "ticket_close_reason"
      )
      .setTitle("Close Ticket");

    const reasonInput =
      new TextInputBuilder()
        .setCustomId(
          "close_reason"
        )
        .setLabel(
          "Reason for closing"
        )
        .setPlaceholder(
          "Enter the reason..."
        )
        .setStyle(
          TextInputStyle.Paragraph
        )
        .setRequired(false)
        .setMaxLength(1000);

    const row =
      new ActionRowBuilder().addComponents(
        reasonInput
      );

    modal.addComponents(row);

    await interaction.showModal(
      modal
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Request close error:",
      error
    );

    return safeReply(interaction, {
      content:
        "❌ Failed to open the close form.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ============================================================
// CLOSE TICKET FROM MODAL
// ============================================================

async function closeTicket(interaction) {
  try {
    if (
      !interaction.deferred &&
      !interaction.replied
    ) {
      await interaction.deferReply({
        flags:
          MessageFlags.Ephemeral,
      });
    }

    const ticket =
      tickets.get(
        interaction.channelId
      );

    if (!ticket) {
      return safeReply(interaction, {
        content:
          "❌ Ticket not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const isOwner =
      ticket.userId ===
      interaction.user.id;

    const isStaff =
      isStaffMember(
        interaction.member
      );

    if (!isOwner && !isStaff) {
      return safeReply(interaction, {
        content:
          "❌ You do not have permission to close the ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status === "closed") {
      return safeReply(interaction, {
        content:
          "⚠️ This ticket is already closed.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const reason =
      interaction.fields
        .getTextInputValue(
          "close_reason"
        )
        ?.trim() ||
      "No reason provided.";

    ticket.status = "closed";

    ticket.closedBy =
      interaction.user.id;

    ticket.closedAt =
      Date.now();

    ticket.closeReason =
      reason;

    tickets.set(
      interaction.channelId,
      ticket
    );

    try {
      await interaction.channel.permissionOverwrites.edit(
        ticket.userId,
        {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false,
        }
      );
    } catch (permissionError) {
      console.error(
        "❌ Failed to remove ticket owner permissions:",
        permissionError
      );
    }

    const closedEmbed =
      new EmbedBuilder()
        .setColor(0xff3333)
        .setTitle(
          "🔒 Ticket Closed"
        )
        .setDescription(
          [
            "This ticket has been closed.",
            "",
            `**Closed by:** <@${interaction.user.id}>`,
            `**Reason:** ${reason}`,
            "",
            "Staff can save the transcript or reopen this ticket.",
          ].join("\n")
        )
        .setTimestamp();

    const transcriptButton =
      new ButtonBuilder()
        .setCustomId(
          "ticket_save_transcript"
        )
        .setLabel(
          "Save Transcript"
        )
        .setEmoji("📄")
        .setStyle(
          ButtonStyle.Primary
        );

    const reopenButton =
      new ButtonBuilder()
        .setCustomId(
          "ticket_reopen"
        )
        .setLabel(
          "Reopen Ticket"
        )
        .setEmoji("🔓")
        .setStyle(
          ButtonStyle.Success
        );

    const row =
      new ActionRowBuilder().addComponents(
        transcriptButton,
        reopenButton
      );

    await interaction.channel.send({
      embeds: [closedEmbed],
      components: [row],
    });

    await logTicket(
      interaction.client,
      interaction.guild,
      "🔒 Ticket Closed",
      [
        `**Ticket:** ${interaction.channel}`,
        `**Owner:** <@${ticket.userId}>`,
        `**Closed By:** <@${interaction.user.id}>`,
        `**Reason:** ${reason}`,
      ].join("\n")
    );

    return safeReply(interaction, {
      content:
        "✅ Ticket closed successfully.",
      flags:
        MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error(
      "❌ Close ticket error:",
      error
    );

    return safeReply(interaction, {
      content:
        "❌ Failed to close the ticket.",
      flags:
        MessageFlags.Ephemeral,
    });
  }
}

// ============================================================
// REOPEN TICKET
// ============================================================

async function reopenTicket(interaction) {
  try {
    if (!requireStaff(interaction)) {
      return safeReply(interaction, {
        content:
          "❌ Only staff can reopen tickets.",
        flags:
          MessageFlags.Ephemeral,
      });
    }

    const ticket =
      tickets.get(
        interaction.channelId
      );

    if (!ticket) {
      return safeReply(interaction, {
        content:
          "❌ Ticket not found.",
        flags:
          MessageFlags.Ephemeral,
      });
    }

    if (ticket.status !== "closed") {
      return safeReply(interaction, {
        content:
          "❌ This ticket is already open.",
        flags:
          MessageFlags.Ephemeral,
      });
    }

    await interaction.channel.permissionOverwrites.edit(
      ticket.userId,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      }
    );

    ticket.status =
      "open";

    ticket.closedBy =
      null;

    ticket.closedAt =
      null;

    ticket.closeReason =
      null;

    tickets.set(
      interaction.channelId,
      ticket
    );

    const embed =
      new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle(
          "🔓 Ticket Reopened"
        )
        .setDescription(
          [
            `This ticket has been reopened by <@${interaction.user.id}>.`,
            "",
            `Ticket owner: <@${ticket.userId}>`,
          ].join("\n")
        )
        .setTimestamp();

    const claimButton =
      new ButtonBuilder()
        .setCustomId(
          "ticket_claim"
        )
        .setLabel(
          "Claim Ticket"
        )
        .setEmoji("🛡️")
        .setStyle(
          ButtonStyle.Primary
        );

    const closeButton =
      new ButtonBuilder()
        .setCustomId(
          "ticket_close"
        )
        .setLabel(
          "Close Ticket"
        )
        .setEmoji("🔒")
        .setStyle(
          ButtonStyle.Danger
        );

    const row =
      new ActionRowBuilder().addComponents(
        claimButton,
        closeButton
      );

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await logTicket(
      interaction.client,
      interaction.guild,
      "🔓 Ticket Reopened",
      `**Staff:** <@${interaction.user.id}>\n**Ticket:** ${interaction.channel}`
    );

    return safeReply(interaction, {
      content:
        "✅ Ticket reopened.",
      flags:
        MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error(
      "❌ Reopen ticket error:",
      error
    );

    return safeReply(interaction, {
      content:
        "❌ Failed to reopen ticket.",
      flags:
        MessageFlags.Ephemeral,
    });
  }
}

// ============================================================
// SAVE TRANSCRIPT
// ============================================================

async function saveTranscription(interaction) {
  try {
    if (!requireStaff(interaction)) {
      return safeReply(interaction, {
        content:
          "❌ Only staff can save transcripts.",
        flags:
          MessageFlags.Ephemeral,
      });
    }

    const ticket =
      tickets.get(
        interaction.channelId
      );

    if (!ticket) {
      return safeReply(interaction, {
        content:
          "❌ Ticket not found.",
        flags:
          MessageFlags.Ephemeral,
      });
    }

    if (ticket.status !== "closed") {
      return safeReply(interaction, {
        content:
          "❌ Close the ticket before saving the transcript.",
        flags:
          MessageFlags.Ephemeral,
      });
    }

    if (
      !interaction.deferred &&
      !interaction.replied
    ) {
      await interaction.deferReply({
        flags:
          MessageFlags.Ephemeral,
      });
    }

    const messages =
      await interaction.channel.messages.fetch({
        limit: 100,
      });

    const sortedMessages =
      [...messages.values()].sort(
        (a, b) =>
          a.createdTimestamp -
          b.createdTimestamp
      );

    let transcript =
      "";

    transcript +=
      "THE WOLF COMMUNITY - TICKET TRANSCRIPT\n";

    transcript +=
      "========================================\n";

    transcript +=
      `Channel: ${interaction.channel.name}\n`;

    transcript +=
      `Owner ID: ${ticket.userId}\n`;

    transcript +=
      `Type: ${ticket.type}\n`;

    transcript +=
      `Created: ${new Date(
        ticket.createdAt
      ).toISOString()}\n`;

    transcript +=
      `Closed: ${new Date(
        ticket.closedAt
      ).toISOString()}\n`;

    transcript +=
      `Closed By: ${ticket.closedBy}\n`;

    transcript +=
      `Close Reason: ${ticket.closeReason}\n`;

    transcript +=
      "========================================\n\n";

    for (
      const message of sortedMessages
    ) {
      const timestamp =
        new Date(
          message.createdTimestamp
        ).toISOString();

      const author =
        message.author?.tag ||
        message.author?.username ||
        "Unknown User";

      let content =
        message.content || "";

      if (
        message.attachments.size >
        0
      ) {
        const attachments =
          [
            ...message.attachments.values(),
          ]
            .map(
              (attachment) =>
                attachment.url
            )
            .join(" ");

        content +=
          ` ${attachments}`;
      }

      transcript +=
        `[${timestamp}] ${author}: ${content}\n`;
    }

    const buffer =
      Buffer.from(
        transcript,
        "utf8"
      );

    const attachment =
      new AttachmentBuilder(
        buffer,
        {
          name:
            `${interaction.channel.name}-transcript.txt`,
        }
      );

    const logChannel =
      await interaction.client.channels
        .fetch(
          TICKET_LOG_CHANNEL_ID
        )
        .catch(
          () => null
        );

    if (
      !logChannel ||
      !logChannel.isTextBased()
    ) {
      return safeReply(
        interaction,
        {
          content:
            "❌ Ticket log channel was not found, so the transcript could not be saved.",
        }
      );
    }

    await logChannel.send({
      content: [
        "📄 **Ticket Transcript**",
        `**Ticket:** ${interaction.channel.name}`,
        `**Owner:** <@${ticket.userId}>`,
        `**Closed By:** <@${ticket.closedBy}>`,
        `**Saved By:** <@${interaction.user.id}>`,
      ].join("\n"),
      files: [attachment],
    });

    await interaction.editReply({
      content:
        "✅ Transcript saved. The ticket will now be deleted.",
    });

    await interaction.channel.delete(
      "Ticket transcript saved"
    );

    tickets.delete(
      interaction.channelId
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Save transcript error:",
      error
    );

    return safeReply(
      interaction,
      {
        content:
          "❌ Failed to save the transcript.",
        flags:
          MessageFlags.Ephemeral,
      }
    );
  }
}

// ============================================================
// LOG TICKET
// ============================================================

async function logTicket(
  client,
  guild,
  title,
  description
) {
  try {
    const channel =
      await client.channels
        .fetch(
          TICKET_LOG_CHANNEL_ID
        )
        .catch(
          () => null
        );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      console.error(
        `❌ Ticket log channel not found: ${TICKET_LOG_CHANNEL_ID}`
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
        .setFooter({
          text:
            guild?.name ||
            "The Wolf Community",
        })
        .setTimestamp();

    await channel.send({
      embeds: [embed],
    });
  } catch (error) {
    console.error(
      "❌ Ticket log error:",
      error
    );
  }
}

// ============================================================
// GET TICKETS
// ============================================================

function getTickets() {
  return [...tickets.values()].map(
    (ticket) => ({
      ...ticket,
    })
  );
}

// ============================================================
// GET TICKET STATS
// ============================================================

function getTicketStats() {
  const allTickets =
    [...tickets.values()];

  return {
    total:
      allTickets.length,

    open:
      allTickets.filter(
        (ticket) =>
          ticket.status === "open"
      ).length,

    closed:
      allTickets.filter(
        (ticket) =>
          ticket.status === "closed"
      ).length,

    claimed:
      allTickets.filter(
        (ticket) =>
          Boolean(
            ticket.claimedBy
          )
      ).length,
  };
}

// ============================================================
// FIND TICKET FOR DASHBOARD
// ============================================================

function findTicketForDashboard(
  channelId
) {
  return (
    tickets.get(
      channelId
    ) || null
  );
}

// ============================================================
// HANDLE BUTTON INTERACTIONS
// ============================================================

async function handleTicketInteraction(
  interaction
) {
  try {
    if (!interaction.isButton()) {
      return false;
    }

    const customId =
      interaction.customId;

    if (
      customId.startsWith(
        "ticket_create:"
      )
    ) {
      const type =
        customId.split(":")[1];

      return await createTicket(
        interaction,
        type
      );
    }

    if (
      customId ===
      "ticket_claim"
    ) {
      return await claimTicket(
        interaction
      );
    }

    if (
      customId ===
      "ticket_close"
    ) {
      return await requestTicketClose(
        interaction
      );
    }

    if (
      customId ===
      "ticket_save_transcript"
    ) {
      return await saveTranscription(
        interaction
      );
    }

    if (
      customId ===
      "ticket_reopen"
    ) {
      return await reopenTicket(
        interaction
      );
    }

    return false;
  } catch (error) {
    console.error(
      "❌ Ticket interaction error:",
      error
    );

    return safeReply(
      interaction,
      {
        content:
          "❌ An error occurred while processing the ticket action.",
        flags:
          MessageFlags.Ephemeral,
      }
    );
  }
}

// ============================================================
// HANDLE MODAL INTERACTIONS
// ============================================================

async function handleTicketModal(
  interaction
) {
  try {
    if (
      !interaction.isModalSubmit()
    ) {
      return false;
    }

    if (
      interaction.customId ===
      "ticket_close_reason"
    ) {
      return await closeTicket(
        interaction
      );
    }

    return false;
  } catch (error) {
    console.error(
      "❌ Ticket modal error:",
      error
    );

    return safeReply(
      interaction,
      {
        content:
          "❌ An error occurred while processing the ticket.",
        flags:
          MessageFlags.Ephemeral,
      }
    );
  }
}

// ============================================================
// ALIASES
// ============================================================

const handleButtonInteraction =
  handleTicketInteraction;

const handleInteraction =
  handleTicketInteraction;

// ============================================================
// EXPORTS
// ============================================================

export {
  createTicketPanel,
  ensureTicketPanel,
  createTicket,
  claimTicket,
  requestTicketClose,
  closeTicket,
  reopenTicket,
  saveTranscription,
  logTicket,
  getTickets,
  getTicketStats,
  findTicketForDashboard,
  handleTicketInteraction,
  handleTicketModal,
  handleButtonInteraction,
  handleInteraction,
  isStaffMember,
};