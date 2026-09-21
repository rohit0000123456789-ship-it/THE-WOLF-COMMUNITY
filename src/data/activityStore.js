import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const activityFile = path.join(dataDir, "activities.json");

const MAX_ACTIVITIES = 200;

function ensureStorage() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(activityFile)) {
        fs.writeFileSync(
            activityFile,
            JSON.stringify([], null, 2),
            "utf8"
        );
    }
}

function readActivities() {
    ensureStorage();

    try {
        const data = fs.readFileSync(
            activityFile,
            "utf8"
        );

        const activities = JSON.parse(data);

        return Array.isArray(activities)
            ? activities
            : [];
    } catch (error) {
        console.error(
            "❌ Failed to read activities:",
            error
        );

        return [];
    }
}

function saveActivities(activities) {
    ensureStorage();

    fs.writeFileSync(
        activityFile,
        JSON.stringify(
            activities.slice(0, MAX_ACTIVITIES),
            null,
            2
        ),
        "utf8"
    );
}


/**
 * Add a new dashboard activity.
 *
 * type examples:
 * ticket
 * application
 * giveaway
 * moderation
 * member
 * voice
 * system
 */
export function addActivity({
    type = "system",
    title,
    description = "",
    userId = null,
    username = null,
    icon = "📌",
    metadata = {}
}) {
    const activities = readActivities();

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

    activities.unshift(activity);

    saveActivities(activities);

    console.log(
        `📡 Activity: ${icon} ${title}`
    );

    return activity;
}


/**
 * Get recent activities.
 */
export function getActivities(limit = 50) {
    const activities = readActivities();

    const safeLimit = Math.min(
        Math.max(Number(limit) || 50, 1),
        MAX_ACTIVITIES
    );

    return activities.slice(0, safeLimit);
}


/**
 * Clear all activities.
 */
export function clearActivities() {
    saveActivities([]);

    return true;
}