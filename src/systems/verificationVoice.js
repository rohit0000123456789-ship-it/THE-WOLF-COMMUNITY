import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ffmpegPath from "ffmpeg-static";

import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
} from "@discordjs/voice";

// ==========================================
// CONFIG
// ==========================================

const VERIFICATION_VC_ID =
    "1548335367101350060";

const UNVERIFIED_ROLE_ID =
    "1550775394758688829";

const CUB_ROLE_ID =
    "1525573700357984258";

// ==========================================
// AUDIO PATH
// ==========================================

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const AUDIO_FILE =
    path.resolve(
        __dirname,
        "../../audio/verification-welcome.mp3"
    );

// ==========================================
// FFMPEG
// ==========================================

if (ffmpegPath) {

    process.env.FFMPEG_PATH =
        ffmpegPath;

    const ffmpegDirectory =
        path.dirname(ffmpegPath);

    if (
        !process.env.PATH.includes(
            ffmpegDirectory
        )
    ) {

        process.env.PATH =
            `${ffmpegDirectory}${path.delimiter}${process.env.PATH}`;
    }
}

// ==========================================
// ACTIVE CONNECTIONS
// ==========================================

const activeConnections =
    new Map();

const activePlayers =
    new Map();

const activeMembers =
    new Map();

// ==========================================
// CHECK AUDIO
// ==========================================

function audioFileExists() {

    try {

        return fs.existsSync(
            AUDIO_FILE
        );

    } catch {

        return false;
    }
}

// ==========================================
// COMPLETE VERIFICATION
// ==========================================

async function completeVerification(
    member
) {

    if (!member) {
        return;
    }

    try {

        // ------------------------------
        // REMOVE UNVERIFIED
        // ------------------------------

        if (
            member.roles.cache.has(
                UNVERIFIED_ROLE_ID
            )
        ) {

            await member.roles.remove(
                UNVERIFIED_ROLE_ID
            );

            console.log(
                `🔓 Removed Unverified from ${member.user.tag}`
            );
        }

        // ------------------------------
        // ADD CUB
        // ------------------------------

        if (
            !member.roles.cache.has(
                CUB_ROLE_ID
            )
        ) {

            await member.roles.add(
                CUB_ROLE_ID
            );

            console.log(
                `🐾 Added Cub role to ${member.user.tag}`
            );
        }

        console.log(
            `✅ Verification completed for ${member.user.tag}`
        );

    } catch (error) {

        console.error(
            "❌ Failed to complete verification:",
            error
        );
    }
}

// ==========================================
// JOIN VERIFICATION VC
// ==========================================

async function joinVerificationVC(
    member
) {

    if (!member) {

        throw new Error(
            "Member is required."
        );
    }

    const guild =
        member.guild;

    const channel =
        guild.channels.cache.get(
            VERIFICATION_VC_ID
        );

    if (!channel) {

        throw new Error(
            "Verification VC not found."
        );
    }

    if (
        !channel.isVoiceBased()
    ) {

        throw new Error(
            "Verification channel is not a voice channel."
        );
    }

    // ------------------------------
    // JOIN VC
    // ------------------------------

    const connection =
        joinVoiceChannel({

            channelId:
                channel.id,

            guildId:
                guild.id,

            adapterCreator:
                guild.voiceAdapterCreator,

            selfDeaf: false,

            selfMute: false
        });

    activeConnections.set(
        guild.id,
        connection
    );

    // ------------------------------
    // WAIT FOR READY
    // ------------------------------

    try {

        await entersState(
            connection,
            VoiceConnectionStatus.Ready,
            15_000
        );

    } catch (error) {

        console.error(
            "❌ Verification VC connection failed:",
            error
        );

        try {

            connection.destroy();

        } catch {}

        activeConnections.delete(
            guild.id
        );

        throw error;
    }

    return connection;
}

// ==========================================
// PLAY VERIFICATION WELCOME
// ==========================================

async function playVerificationWelcome(
    member
) {

    if (!member) {

        console.error(
            "❌ Verification member missing."
        );

        return;
    }

    // ------------------------------
    // ONLY UNVERIFIED MEMBERS
    // ------------------------------

    if (
        !member.roles.cache.has(
            UNVERIFIED_ROLE_ID
        )
    ) {

        console.log(
            `ℹ️ ${member.user.tag} is already verified.`
        );

        return;
    }

    // ------------------------------
    // PREVENT DUPLICATE AUDIO
    // ------------------------------

    if (
        activeMembers.has(
            member.id
        )
    ) {

        console.log(
            `ℹ️ Verification already running for ${member.user.tag}`
        );

        return;
    }

    // ------------------------------
    // CHECK AUDIO
    // ------------------------------

    if (
        !audioFileExists()
    ) {

        console.error(
            `❌ Verification audio not found:\n${AUDIO_FILE}`
        );

        return;
    }

    activeMembers.set(
        member.id,
        true
    );

    let connection = null;

    let player = null;

    try {

        console.log(
            `🔊 Starting verification for ${member.user.tag}`
        );

        // ------------------------------
        // JOIN VC
        // ------------------------------

        connection =
            activeConnections.get(
                member.guild.id
            );

        if (!connection) {

            connection =
                await joinVerificationVC(
                    member
                );
        }

        // ------------------------------
        // CREATE PLAYER
        // ------------------------------

        player =
            createAudioPlayer();

        activePlayers.set(
            member.guild.id,
            player
        );

        // ------------------------------
        // CREATE AUDIO RESOURCE
        // ------------------------------

        const resource =
            createAudioResource(
                AUDIO_FILE,
                {
                    inlineVolume: true
                }
            );

        resource.volume.setVolume(
            1.0
        );

        // ------------------------------
        // SUBSCRIBE
        // ------------------------------

        connection.subscribe(
            player
        );

        // ------------------------------
        // PLAYER EVENTS
        // ------------------------------

        player.on(
            "error",
            async error => {

                console.error(
                    `❌ Verification audio error for ${member.user.tag}:`,
                    error
                );

                await finishVerification(
                    member,
                    connection,
                    player
                );
            }
        );

        player.on(
            AudioPlayerStatus.Idle,
            async () => {

                console.log(
                    `🔊 Verification audio finished for ${member.user.tag}`
                );

                await finishVerification(
                    member,
                    connection,
                    player
                );
            }
        );

        // ------------------------------
        // PLAY
        // ------------------------------

        player.play(
            resource
        );

        console.log(
            `▶️ Playing verification audio for ${member.user.tag}`
        );

    } catch (error) {

        console.error(
            "❌ Verification voice system error:",
            error
        );

        await finishVerification(
            member,
            connection,
            player
        );
    }
}

// ==========================================
// FINISH VERIFICATION
// ==========================================

async function finishVerification(
    member,
    connection,
    player
) {

    try {

        // ------------------------------
        // VERIFY MEMBER
        // ------------------------------

        await completeVerification(
            member
        );

    } catch (error) {

        console.error(
            "❌ Verification completion error:",
            error
        );

    } finally {

        // ------------------------------
        // STOP PLAYER
        // ------------------------------

        try {

            if (player) {

                player.stop();
            }

        } catch {}

        // ------------------------------
        // REMOVE PLAYER
        // ------------------------------

        activePlayers.delete(
            member.guild.id
        );

        // ------------------------------
        // REMOVE MEMBER
        // ------------------------------

        activeMembers.delete(
            member.id
        );

        // ------------------------------
        // DESTROY CONNECTION
        // ------------------------------

        try {

            if (connection) {

                connection.destroy();
            }

        } catch {}

        activeConnections.delete(
            member.guild.id
        );

        console.log(
            `🔌 Verification voice connection closed for ${member.user.tag}`
        );
    }
}

// ==========================================
// LEAVE VERIFICATION VC
// ==========================================

function leaveVerificationVC(
    guildId
) {

    try {

        const player =
            activePlayers.get(
                guildId
            );

        if (player) {

            player.stop();
        }

    } catch {}

    try {

        const connection =
            activeConnections.get(
                guildId
            );

        if (connection) {

            connection.destroy();
        }

    } catch {}

    activePlayers.delete(
        guildId
    );

    activeConnections.delete(
        guildId
    );

    // Remove active members belonging
    // to this guild

    for (
        const [memberId]
        of activeMembers
    ) {

        const guild =
            connectionGuildCache.get(
                memberId
            );

        if (
            guild === guildId
        ) {

            activeMembers.delete(
                memberId
            );
        }
    }
}

// ==========================================
// CONNECTION GUILD CACHE
// ==========================================

const connectionGuildCache =
    new Map();

// ==========================================
// VERIFICATION ACTIVE CHECK
// ==========================================

function isVerificationVoiceActive(
    guildId
) {

    return activeConnections.has(
        guildId
    );
}

// ==========================================
// INITIALIZE VERIFICATION VOICE
// ==========================================

async function initVerificationVoice(
    client
) {

    console.log(
        "🔊 Initializing verification voice system..."
    );

    if (
        !audioFileExists()
    ) {

        console.error(
            `❌ Verification audio file does not exist:\n${AUDIO_FILE}`
        );

    } else {

        console.log(
            `✅ Verification audio found:\n${AUDIO_FILE}`
        );
    }

    // Make sure stale connections
    // are cleaned up if the bot reconnects.

    client.on(
        "voiceStateUpdate",
        (
            oldState,
            newState
        ) => {

            try {

                if (
                    oldState.channelId ===
                    VERIFICATION_VC_ID &&
                    newState.channelId !==
                    VERIFICATION_VC_ID
                ) {

                    const member =
                        oldState.member;

                    if (!member) {
                        return;
                    }

                    // If no other unverified
                    // members remain, the connection
                    // can be cleaned up later.

                    const guild =
                        member.guild;

                    const verificationChannel =
                        guild.channels.cache.get(
                            VERIFICATION_VC_ID
                        );

                    if (
                        !verificationChannel
                    ) {

                        return;
                    }

                    const unverifiedMembers =
                        verificationChannel.members.filter(
                            voiceMember =>
                                voiceMember.roles.cache.has(
                                    UNVERIFIED_ROLE_ID
                                )
                        );

                    if (
                        unverifiedMembers.size === 0
                    ) {

                        setTimeout(
                            () => {

                                const currentConnection =
                                    activeConnections.get(
                                        guild.id
                                    );

                                if (
                                    currentConnection
                                ) {

                                    try {

                                        currentConnection.destroy();

                                    } catch {}

                                    activeConnections.delete(
                                        guild.id
                                    );
                                }

                                const currentPlayer =
                                    activePlayers.get(
                                        guild.id
                                    );

                                if (
                                    currentPlayer
                                ) {

                                    try {

                                        currentPlayer.stop();

                                    } catch {}

                                    activePlayers.delete(
                                        guild.id
                                    );
                                }

                            },
                            1500
                        );
                    }
                }

            } catch (error) {

                console.error(
                    "❌ Verification voice cleanup error:",
                    error
                );
            }
        }
    );

    console.log(
        "✅ Verification voice system initialized."
    );
}

// ==========================================
// EXPORTS
// ==========================================

export {
    VERIFICATION_VC_ID,
    UNVERIFIED_ROLE_ID,
    CUB_ROLE_ID,

    joinVerificationVC,

    playVerificationWelcome,

    leaveVerificationVC,

    isVerificationVoiceActive,

    initVerificationVoice
};