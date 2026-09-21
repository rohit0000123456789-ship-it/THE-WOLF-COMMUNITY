// dashboard/public/app.js

const state = {
    currentPage: "dashboard",
    auth: null,
    bot: null,
    server: null,
    stats: null,
    activities: [],
    members: [],
    tickets: [],
    applications: [],
    leave: [],
    giveaways: [],
    moderation: []
};

const API_BASE = "";

const pageTitles = {
    dashboard: ["Dashboard", "Welcome back, Wolf Admin."],
    members: ["Members", "Manage and monitor your community members."],
    tickets: ["Tickets", "Manage support, partnership and giveaway tickets."],
    applications: ["Applications", "Review staff and community applications."],
    leave: ["Staff Leave", "Manage staff holiday and leave requests."],
    giveaways: ["Giveaways", "Manage community giveaways."],
    moderation: ["Moderation", "Review moderation actions and cases."],
    staff: ["Staff", "View the Wolf Community staff team."],
    settings: ["Settings", "Dashboard and system configuration."]
};

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    loadDashboard();
    setInterval(loadDashboardData, 5000);
});

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();

            const page = item.dataset.page;

            if (!page) return;

            navigate(page);
        });
    });
}

function navigate(page) {
    state.currentPage = page;

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });

    const title = pageTitles[page] || ["Dashboard", "Welcome back, Wolf Admin."];

    const titleElement = document.getElementById("pageTitle");
    const subtitleElement = document.getElementById("pageSubtitle");

    if (titleElement) {
        titleElement.textContent = title[0];
    }

    if (subtitleElement) {
        subtitleElement.textContent = title[1];
    }

    renderCurrentPage();

    if (window.innerWidth <= 900) {
        closeSidebar();
    }
}

async function loadDashboard() {
    await loadAuth();

    if (!state.auth?.authenticated) {
        window.location.href = "/login";
        return;
    }

    await loadDashboardData();
}

async function loadDashboardData() {
    if (!state.auth?.authenticated) {
        await loadAuth();

        if (!state.auth?.authenticated) {
            window.location.href = "/login";
            return;
        }
    }

    await Promise.all([
        loadStatus(),
        loadServer(),
        loadStats(),
        loadActivities(),
        loadMembers(),
        loadTickets(),
        loadApplications(),
        loadLeave(),
        loadGiveaways(),
        loadModeration()
    ]);

    renderCurrentPage();
}

async function loadAuth() {
    try {
        const response = await fetch("/api/auth", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            state.auth = {
                authenticated: false
            };
            return;
        }

        state.auth = await response.json();
    } catch (error) {
        console.error("Auth error:", error);

        state.auth = {
            authenticated: false
        };
    }
}

async function apiGet(path) {
    try {
        const response = await fetch(path, {
            credentials: "same-origin"
        });

        if (response.status === 401) {
            window.location.href = "/login";
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.error ||
                data?.message ||
                `Request failed: ${response.status}`
            );
        }

        return data;
    } catch (error) {
        console.error(`GET ${path}`, error);
        return null;
    }
}

async function apiPost(path, body = {}) {
    try {
        const response = await fetch(path, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (response.status === 401) {
            window.location.href = "/login";
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data?.error ||
                data?.message ||
                `Request failed: ${response.status}`
            );
        }

        return data;
    } catch (error) {
        console.error(`POST ${path}`, error);
        showToast(error.message || "Something went wrong.", "error");
        return null;
    }
}

async function loadStatus() {
    const data = await apiGet("/api/bot/api/status");

    if (data) {
        state.bot = data;
    }
}

async function loadServer() {
    const data = await apiGet("/api/bot/api/server");

    if (data) {
        state.server = data;
    }
}

async function loadStats() {
    const data = await apiGet("/api/bot/api/stats");

    if (data) {
        state.stats = data;
    }
}

async function loadActivities() {
    const data = await apiGet(
        "/api/bot/api/activities?limit=20"
    );

    if (data) {
        state.activities = Array.isArray(data)
            ? data
            : data.activities || [];
    }
}

async function loadMembers() {
    const data = await apiGet("/api/bot/api/members");

    if (data) {
        state.members = Array.isArray(data)
            ? data
            : data.members || [];
    }
}

async function loadTickets() {
    const data = await apiGet("/api/bot/api/tickets");

    if (data) {
        state.tickets = Array.isArray(data)
            ? data
            : data.tickets || [];
    }
}

async function loadApplications() {
    const data = await apiGet(
        "/api/bot/api/applications"
    );

    if (data) {
        state.applications = Array.isArray(data)
            ? data
            : data.applications || [];
    }
}

async function loadLeave() {
    const data = await apiGet("/api/bot/api/leave");

    if (data) {
        state.leave = Array.isArray(data)
            ? data
            : data.leave || data.applications || [];
    }
}

async function loadGiveaways() {
    const data = await apiGet(
        "/api/bot/api/giveaways"
    );

    if (data) {
        state.giveaways = Array.isArray(data)
            ? data
            : data.giveaways || [];
    }
}

async function loadModeration() {
    const data = await apiGet(
        "/api/bot/api/moderation/cases"
    );

    if (data) {
        state.moderation = Array.isArray(data)
            ? data
            : data.cases || [];
    }
}

function renderCurrentPage() {
    const container = document.getElementById("pageContent");

    if (!container) return;

    switch (state.currentPage) {
        case "dashboard":
            renderDashboard(container);
            break;

        case "members":
            renderMembers(container);
            break;

        case "tickets":
            renderTickets(container);
            break;

        case "applications":
            renderApplications(container);
            break;

        case "leave":
            renderLeave(container);
            break;

        case "giveaways":
            renderGiveaways(container);
            break;

        case "moderation":
            renderModeration(container);
            break;

        case "staff":
            renderStaff(container);
            break;

        case "settings":
            renderSettings(container);
            break;

        default:
            renderDashboard(container);
    }

    updateConnectionStatus();
    updateSidebarStatus();
}

function renderDashboard(container) {
    const stats = getStats();

    container.innerHTML = `
        <section class="page-section">

            <div class="stats-grid">

                ${statCard(
                    "👥",
                    "Members",
                    formatNumber(stats.members),
                    "Total community members"
                )}

                ${statCard(
                    "🎫",
                    "Open Tickets",
                    formatNumber(stats.openTickets),
                    "Currently active tickets"
                )}

                ${statCard(
                    "📋",
                    "Applications",
                    formatNumber(stats.applications),
                    "Pending applications"
                )}

                ${statCard(
                    "🏖️",
                    "Staff Leave",
                    formatNumber(stats.leave),
                    "Pending leave requests"
                )}

                ${statCard(
                    "🎁",
                    "Giveaways",
                    formatNumber(stats.giveaways),
                    "Active giveaways"
                )}

                ${statCard(
                    "🛡️",
                    "Moderation Cases",
                    formatNumber(stats.moderation),
                    "Recorded moderation cases"
                )}

            </div>

            <div class="dashboard-grid">

                <div class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>Live Activity</h3>
                            <p>Recent community activity</p>
                        </div>

                        <span class="live-badge">
                            <span class="status-dot"></span>
                            LIVE
                        </span>
                    </div>

                    <div class="activity-list">
                        ${
                            state.activities.length
                                ? state.activities
                                    .slice(0, 10)
                                    .map(renderActivity)
                                    .join("")
                                : emptyState(
                                    "No recent activity",
                                    "Activity will appear here."
                                )
                        }
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>Server Overview</h3>
                            <p>Current Wolf Community status</p>
                        </div>
                    </div>

                    <div class="overview-list">

                        ${overviewRow(
                            "Server",
                            state.server?.name || "The Wolf Community"
                        )}

                        ${overviewRow(
                            "Bot",
                            state.bot?.username ||
                            state.bot?.tag ||
                            "Wolf Bot"
                        )}

                        ${overviewRow(
                            "Members",
                            formatNumber(
                                state.server?.memberCount ??
                                state.stats?.members ??
                                0
                            )
                        )}

                        ${overviewRow(
                            "Status",
                            state.bot?.ready === false
                                ? "Offline"
                                : "Online",
                            true
                        )}

                        ${overviewRow(
                            "Last update",
                            new Date().toLocaleTimeString()
                        )}

                    </div>
                </div>

            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Quick Actions</h3>
                        <p>Open the management section you need.</p>
                    </div>
                </div>

                <div class="quick-actions">

                    ${quickAction(
                        "🎫",
                        "Tickets",
                        "Manage support tickets",
                        "tickets"
                    )}

                    ${quickAction(
                        "📋",
                        "Applications",
                        "Review applications",
                        "applications"
                    )}

                    ${quickAction(
                        "🏖️",
                        "Staff Leave",
                        "Review leave requests",
                        "leave"
                    )}

                    ${quickAction(
                        "🎁",
                        "Giveaways",
                        "Manage giveaways",
                        "giveaways"
                    )}

                    ${quickAction(
                        "🛡️",
                        "Moderation",
                        "Review moderation cases",
                        "moderation"
                    )}

                </div>
            </div>

        </section>
    `;

    container
        .querySelectorAll("[data-quick-page]")
        .forEach(button => {
            button.addEventListener("click", () => {
                navigate(button.dataset.quickPage);
            });
        });
}

function renderMembers(container) {
    const members = [...state.members];

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">
                <div>
                    <h2>Members</h2>
                    <p>
                        ${
                            members.length
                        } members returned by the bot API.
                    </p>
                </div>

                <button
                    class="action-button"
                    onclick="loadDashboardData()"
                >
                    ↻ Refresh
                </button>
            </div>

            <div class="panel">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>ID</th>
                                <th>Roles</th>
                                <th>Joined</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                members.length
                                    ? members
                                        .map(renderMemberRow)
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="5">
                                                ${emptyState(
                                                    "No members",
                                                    "No member data is available."
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}

function renderTickets(container) {
    const tickets = [...state.tickets].reverse();

    const openTickets = tickets.filter(
        ticket =>
            String(ticket.status || "open").toLowerCase() ===
            "open"
    );

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Ticket Management</h2>
                    <p>
                        ${
                            openTickets.length
                        } open ticket${
                            openTickets.length === 1 ? "" : "s"
                        }.
                    </p>
                </div>

                <button
                    class="action-button"
                    onclick="loadDashboardData()"
                >
                    ↻ Refresh
                </button>

            </div>

            <div class="ticket-summary">

                ${summaryCard(
                    "Open",
                    openTickets.length,
                    "🟢"
                )}

                ${summaryCard(
                    "Total",
                    tickets.length,
                    "🎫"
                )}

                ${summaryCard(
                    "Claimed",
                    tickets.filter(t => t.claimedBy).length,
                    "👮"
                )}

                ${summaryCard(
                    "Closed",
                    tickets.filter(
                        t =>
                            String(t.status || "")
                                .toLowerCase() === "closed"
                    ).length,
                    "🔒"
                )}

            </div>

            <div class="panel">

                <div class="panel-header">
                    <div>
                        <h3>Tickets</h3>
                        <p>
                            General, partnership and giveaway tickets.
                        </p>
                    </div>
                </div>

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th>Type</th>
                                <th>User</th>
                                <th>Status</th>
                                <th>Claimed By</th>
                                <th>Created</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                tickets.length
                                    ? tickets
                                        .map(renderTicketRow)
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="6">
                                                ${emptyState(
                                                    "No tickets",
                                                    "Tickets will appear here."
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}

function renderApplications(container) {
    const applications = [...state.applications].reverse();

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Applications</h2>
                    <p>
                        Review staff, partnership and community applications.
                    </p>
                </div>

                <button
                    class="action-button"
                    onclick="loadDashboardData()"
                >
                    ↻ Refresh
                </button>

            </div>

            <div class="panel">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Reviewed By</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                applications.length
                                    ? applications
                                        .map(renderApplicationRow)
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="5">
                                                ${emptyState(
                                                    "No applications",
                                                    "Applications will appear here."
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}

function renderLeave(container) {
    const leave = [...state.leave].reverse();

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Staff Leave</h2>
                    <p>
                        Review and manage staff holiday requests.
                    </p>
                </div>

                <button
                    class="action-button"
                    onclick="loadDashboardData()"
                >
                    ↻ Refresh
                </button>

            </div>

            <div class="panel">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Staff</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                leave.length
                                    ? leave
                                        .map(renderLeaveRow)
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="6">
                                                ${emptyState(
                                                    "No leave requests",
                                                    "Staff leave requests will appear here."
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}

function renderGiveaways(container) {
    const giveaways = [...state.giveaways].reverse();

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Giveaways</h2>
                    <p>
                        Manage community giveaways and winners.
                    </p>
                </div>

                <div class="toolbar-actions">

                    <button
                        class="action-button primary"
                        onclick="showCreateGiveawayMessage()"
                    >
                        ＋ Create Giveaway
                    </button>

                    <button
                        class="action-button"
                        onclick="loadDashboardData()"
                    >
                        ↻ Refresh
                    </button>

                </div>

            </div>

            <div class="panel">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Giveaway</th>
                                <th>Prize</th>
                                <th>Status</th>
                                <th>Winners</th>
                                <th>Created</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                giveaways.length
                                    ? giveaways
                                        .map(renderGiveawayRow)
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="5">
                                                ${emptyState(
                                                    "No giveaways",
                                                    "Create a giveaway from Discord or the dashboard."
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}

function renderModeration(container) {
    const cases = [...state.moderation].reverse();

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Moderation</h2>
                    <p>
                        View moderation actions and case history.
                    </p>
                </div>

                <button
                    class="action-button"
                    onclick="loadDashboardData()"
                >
                    ↻ Refresh
                </button>

            </div>

            <div class="panel">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Case</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Moderator</th>
                                <th>Reason</th>
                                <th>Date</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                cases.length
                                    ? cases
                                        .map(renderModerationRow)
                                        .join("")
                                    : `
                                        <tr>
                                            <td colspan="6">
                                                ${emptyState(
                                                    "No moderation cases",
                                                    "Moderation history will appear here."
                                                )}
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>
    `;
}

function renderStaff(container) {
    const staff = [
        {
            name: "Supreme Wolf Owner",
            role: "Owner",
            status: "Online"
        },
        {
            name: "Counch",
            role: "Guardian",
            status: "Online"
        },
        {
            name: "Guardian Team",
            role: "Guardian",
            status: "Active"
        },
        {
            name: "Moderator Team",
            role: "Moderator",
            status: "Active"
        }
    ];

    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Staff Management</h2>
                    <p>
                        Wolf Community staff overview.
                    </p>
                </div>

            </div>

            <div class="staff-grid">

                ${
                    staff
                        .map(member => `
                            <div class="staff-card">

                                <div class="staff-avatar">
                                    ${escapeHtml(
                                        member.name
                                            .charAt(0)
                                            .toUpperCase()
                                    )}
                                </div>

                                <div class="staff-info">

                                    <h3>
                                        ${escapeHtml(member.name)}
                                    </h3>

                                    <span>
                                        ${escapeHtml(member.role)}
                                    </span>

                                    <small>
                                        <span class="status-dot"></span>
                                        ${escapeHtml(member.status)}
                                    </small>

                                </div>

                            </div>
                        `)
                        .join("")
                }

            </div>

        </section>
    `;
}

function renderSettings(container) {
    container.innerHTML = `
        <section class="page-section">

            <div class="page-toolbar">

                <div>
                    <h2>Settings</h2>
                    <p>
                        Dashboard session and system information.
                    </p>
                </div>

            </div>

            <div class="settings-grid">

                <div class="panel">

                    <div class="panel-header">
                        <div>
                            <h3>Dashboard Account</h3>
                            <p>Current authenticated session.</p>
                        </div>
                    </div>

                    <div class="overview-list">

                        ${overviewRow(
                            "Username",
                            state.auth?.username || "admin"
                        )}

                        ${overviewRow(
                            "Authentication",
                            state.auth?.authenticated
                                ? "Authenticated"
                                : "Not authenticated",
                            state.auth?.authenticated
                        )}

                        ${overviewRow(
                            "Dashboard",
                            "Port 3000"
                        )}

                        ${overviewRow(
                            "Bot API",
                            "Port 3001"
                        )}

                    </div>

                    <div class="settings-actions">

                        <button
                            class="action-button danger"
                            onclick="logout()"
                        >
                            Logout
                        </button>

                    </div>

                </div>

                <div class="panel">

                    <div class="panel-header">
                        <div>
                            <h3>System Status</h3>
                            <p>Current connection state.</p>
                        </div>
                    </div>

                    <div class="overview-list">

                        ${overviewRow(
                            "Wolf Bot",
                            state.bot?.ready === false
                                ? "Offline"
                                : "Online",
                            state.bot?.ready !== false
                        )}

                        ${overviewRow(
                            "Discord Server",
                            state.server?.name ||
                            "The Wolf Community"
                        )}

                        ${overviewRow(
                            "Automatic Refresh",
                            "Every 5 seconds"
                        )}

                    </div>

                </div>

            </div>

        </section>
    `;
}

function renderMemberRow(member) {
    const username =
        member.username ||
        member.name ||
        member.displayName ||
        "Unknown";

    const id =
        member.id ||
        member.userId ||
        "—";

    const roles = Array.isArray(member.roles)
        ? member.roles
        : [];

    const joined =
        member.joinedAt ||
        member.createdAt ||
        null;

    return `
        <tr>

            <td>
                <div class="user-cell">

                    <div class="user-avatar">
                        ${escapeHtml(
                            username
                                .charAt(0)
                                .toUpperCase()
                        )}
                    </div>

                    <div>
                        <strong>
                            ${escapeHtml(username)}
                        </strong>
                    </div>

                </div>
            </td>

            <td>
                <code>
                    ${escapeHtml(id)}
                </code>
            </td>

            <td>
                ${
                    roles.length
                        ? roles
                            .slice(0, 4)
                            .map(
                                role => `
                                    <span class="tag">
                                        ${escapeHtml(
                                            typeof role === "string"
                                                ? role
                                                : role.name || "Role"
                                        )}
                                    </span>
                                `
                            )
                            .join("")
                        : "—"
                }
            </td>

            <td>
                ${formatDate(joined)}
            </td>

            <td>
                <span class="status-pill online">
                    Active
                </span>
            </td>

        </tr>
    `;
}

function renderTicketRow(ticket) {
    const type =
        ticket.type ||
        "general";

    const status =
        ticket.status ||
        "open";

    const username =
        ticket.username ||
        ticket.userName ||
        ticket.userId ||
        "Unknown";

    const channel =
        ticket.channelName ||
        ticket.channelId ||
        "Ticket";

    const claimedBy =
        ticket.claimedByName ||
        ticket.claimedBy ||
        "Unclaimed";

    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(channel)}
                </strong>
            </td>

            <td>
                <span class="tag">
                    ${escapeHtml(
                        capitalize(type)
                    )}
                </span>
            </td>

            <td>
                ${escapeHtml(username)}
            </td>

            <td>
                ${statusPill(status)}
            </td>

            <td>
                ${
                    claimedBy === "Unclaimed"
                        ? `<span class="muted">Unclaimed</span>`
                        : escapeHtml(claimedBy)
                }
            </td>

            <td>
                ${formatDate(
                    ticket.createdAt
                )}
            </td>

        </tr>
    `;
}

function renderApplicationRow(application) {
    const username =
        application.username ||
        application.userName ||
        application.userId ||
        "Unknown";

    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(username)}
                </strong>
            </td>

            <td>
                <span class="tag">
                    ${escapeHtml(
                        capitalize(
                            application.type ||
                            "application"
                        )
                    )}
                </span>
            </td>

            <td>
                ${statusPill(
                    application.status ||
                    "pending"
                )}
            </td>

            <td>
                ${formatDate(
                    application.createdAt
                )}
            </td>

            <td>
                ${
                    application.reviewedBy
                        ? escapeHtml(
                            application.reviewedBy
                        )
                        : `<span class="muted">Pending</span>`
                }
            </td>

        </tr>
    `;
}

function renderLeaveRow(application) {
    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(
                        application.username ||
                        application.userName ||
                        application.userId ||
                        "Unknown"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    application.startDate ||
                    application.start ||
                    application.startAt ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    application.endDate ||
                    application.end ||
                    application.endAt ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    application.reason ||
                    "—"
                )}
            </td>

            <td>
                ${statusPill(
                    application.status ||
                    "pending"
                )}
            </td>

            <td>
                ${formatDate(
                    application.createdAt ||
                    application.submittedAt
                )}
            </td>

        </tr>
    `;
}

function renderGiveawayRow(giveaway) {
    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(
                        giveaway.title ||
                        giveaway.name ||
                        giveaway.id ||
                        "Giveaway"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    giveaway.prize ||
                    giveaway.reward ||
                    "—"
                )}
            </td>

            <td>
                ${statusPill(
                    giveaway.status ||
                    "active"
                )}
            </td>

            <td>
                ${
                    giveaway.winners?.length
                        ? formatNumber(
                            giveaway.winners.length
                        )
                        : escapeHtml(
                            giveaway.winnerCount ||
                            "—"
                        )
                }
            </td>

            <td>
                ${formatDate(
                    giveaway.createdAt
                )}
            </td>

        </tr>
    `;
}

function renderModerationRow(item) {
    return `
        <tr>

            <td>
                <code>
                    ${escapeHtml(
                        item.caseId ||
                        item.id ||
                        "—"
                    )}
                </code>
            </td>

            <td>
                ${escapeHtml(
                    item.username ||
                    item.userName ||
                    item.userId ||
                    "Unknown"
                )}
            </td>

            <td>
                <span class="tag">
                    ${escapeHtml(
                        capitalize(
                            item.action ||
                            item.type ||
                            "Action"
                        )
                    )}
                </span>
            </td>

            <td>
                ${escapeHtml(
                    item.moderator ||
                    item.moderatorName ||
                    item.moderatorId ||
                    "Unknown"
                )}
            </td>

            <td>
                ${escapeHtml(
                    item.reason ||
                    "—"
                )}
            </td>

            <td>
                ${formatDate(
                    item.createdAt ||
                    item.timestamp
                )}
            </td>

        </tr>
    `;
}

function renderActivity(activity) {
    const title =
        activity.title ||
        activity.action ||
        activity.type ||
        "Activity";

    const description =
        activity.description ||
        activity.message ||
        activity.username ||
        "";

    return `
        <div class="activity-item">

            <div class="activity-icon">
                ${activityIcon(
                    activity.type ||
                    activity.action
                )}
            </div>

            <div class="activity-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                ${
                    description
                        ? `
                            <p>
                                ${escapeHtml(
                                    String(description)
                                )}
                            </p>
                        `
                        : ""
                }

                <small>
                    ${formatDate(
                        activity.createdAt ||
                        activity.timestamp
                    )}
                </small>

            </div>

        </div>
    `;
}

function statCard(icon, title, value, description) {
    return `
        <div class="stat-card">

            <div class="stat-icon">
                ${icon}
            </div>

            <div class="stat-content">

                <span>
                    ${escapeHtml(title)}
                </span>

                <strong>
                    ${escapeHtml(String(value))}
                </strong>

                <small>
                    ${escapeHtml(description)}
                </small>

            </div>

        </div>
    `;
}

function summaryCard(title, value, icon) {
    return `
        <div class="summary-card">

            <div class="summary-icon">
                ${icon}
            </div>

            <div>
                <span>
                    ${escapeHtml(title)}
                </span>

                <strong>
                    ${formatNumber(value)}
                </strong>
            </div>

        </div>
    `;
}

function quickAction(icon, title, description, page) {
    return `
        <button
            class="quick-action"
            data-quick-page="${escapeHtml(page)}"
        >

            <span class="quick-icon">
                ${icon}
            </span>

            <span>
                <strong>
                    ${escapeHtml(title)}
                </strong>

                <small>
                    ${escapeHtml(description)}
                </small>
            </span>

            <span class="quick-arrow">
                →
            </span>

        </button>
    `;
}

function overviewRow(label, value, online = false) {
    return `
        <div class="overview-row">

            <span>
                ${escapeHtml(label)}
            </span>

            <strong class="${online ? "online-text" : ""}">
                ${
                    online
                        ? `<span class="status-dot"></span>`
                        : ""
                }

                ${escapeHtml(
                    String(value ?? "—")
                )}
            </strong>

        </div>
    `;
}

function emptyState(title, description) {
    return `
        <div class="empty-state">

            <div class="empty-icon">
                🐺
            </div>

            <h3>
                ${escapeHtml(title)}
            </h3>

            <p>
                ${escapeHtml(description)}
            </p>

        </div>
    `;
}

function statusPill(status) {
    const normalized =
        String(status || "unknown")
            .toLowerCase();

    let className = "neutral";

    if (
        normalized === "open" ||
        normalized === "active" ||
        normalized === "accepted" ||
        normalized === "approved" ||
        normalized === "online"
    ) {
        className = "success";
    }

    if (
        normalized === "pending" ||
        normalized === "interview" ||
        normalized === "claimed"
    ) {
        className = "warning";
    }

    if (
        normalized === "closed" ||
        normalized === "denied" ||
        normalized === "rejected" ||
        normalized === "cancelled" ||
        normalized === "offline"
    ) {
        className = "danger";
    }

    return `
        <span class="status-pill ${className}">
            ${escapeHtml(
                capitalize(normalized)
            )}
        </span>
    `;
}

function activityIcon(type) {
    const value =
        String(type || "")
            .toLowerCase();

    if (value.includes("ticket")) return "🎫";
    if (value.includes("application")) return "📋";
    if (value.includes("leave")) return "🏖️";
    if (value.includes("giveaway")) return "🎁";
    if (value.includes("ban")) return "🔨";
    if (value.includes("kick")) return "👢";
    if (value.includes("timeout")) return "⏳";
    if (value.includes("warn")) return "⚠️";
    if (value.includes("member")) return "👤";

    return "🐺";
}

function getStats() {
    const stats = state.stats || {};

    return {
        members:
            stats.members ??
            stats.memberCount ??
            state.server?.memberCount ??
            state.members.length ??
            0,

        openTickets:
            stats.openTickets ??
            state.tickets.filter(
                ticket =>
                    String(
                        ticket.status || "open"
                    ).toLowerCase() === "open"
            ).length,

        applications:
            stats.applications ??
            state.applications.filter(
                app =>
                    String(
                        app.status || "pending"
                    ).toLowerCase() === "pending"
            ).length,

        leave:
            stats.leave ??
            stats.pendingLeave ??
            state.leave.filter(
                item =>
                    String(
                        item.status || "pending"
                    ).toLowerCase() === "pending"
            ).length,

        giveaways:
            stats.giveaways ??
            stats.activeGiveaways ??
            state.giveaways.filter(
                giveaway =>
                    String(
                        giveaway.status || "active"
                    ).toLowerCase() === "active"
            ).length,

        moderation:
            stats.moderation ??
            stats.moderationCases ??
            state.moderation.length
    };
}

function updateConnectionStatus() {
    const connected =
        state.bot &&
        state.bot.ready !== false &&
        state.bot.connected !== false;

    const text =
        document.getElementById("connectionText");

    if (text) {
        text.textContent =
            connected
                ? "Connected"
                : "Disconnected";
    }

    const dots =
        document.querySelectorAll(
            ".connection .status-dot"
        );

    dots.forEach(dot => {
        dot.classList.toggle(
            "offline",
            !connected
        );
    });
}

function updateSidebarStatus() {
    const element =
        document.getElementById(
            "sidebarStatus"
        );

    if (!element) return;

    const connected =
        state.bot &&
        state.bot.ready !== false &&
        state.bot.connected !== false;

    element.textContent =
        connected
            ? "Online"
            : "Offline";
}

function showCreateGiveawayMessage() {
    showToast(
        "Giveaway creation from dashboard will be connected to the bot API next.",
        "info"
    );
}

async function logout() {
    try {
        await fetch("/api/logout", {
            method: "POST",
            credentials: "same-origin"
        });
    } catch (error) {
        console.error(error);
    }

    window.location.href = "/login";
}

function toggleSidebar() {
    document
        .querySelector(".sidebar")
        ?.classList.toggle("mobile-open");
}

function closeSidebar() {
    document
        .querySelector(".sidebar")
        ?.classList.remove("mobile-open");
}

function showToast(message, type = "info") {
    let container =
        document.getElementById(
            "toastContainer"
        );

    if (!container) {
        container =
            document.createElement("div");

        container.id =
            "toastContainer";

        container.style.position =
            "fixed";

        container.style.right =
            "20px";

        container.style.bottom =
            "20px";

        container.style.zIndex =
            "99999";

        container.style.display =
            "flex";

        container.style.flexDirection =
            "column";

        container.style.gap =
            "10px";

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement("div");

    toast.className =
        `wolf-toast ${type}`;

    toast.textContent =
        message;

    toast.style.padding =
        "13px 16px";

    toast.style.borderRadius =
        "12px";

    toast.style.background =
        "rgba(20,20,25,.96)";

    toast.style.border =
        "1px solid rgba(255,255,255,.1)";

    toast.style.color =
        "#fff";

    toast.style.boxShadow =
        "0 12px 30px rgba(0,0,0,.3)";

    toast.style.maxWidth =
        "360px";

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity =
            "0";

        toast.style.transform =
            "translateY(8px)";

        toast.style.transition =
            "all .25s ease";

        setTimeout(() => {
            toast.remove();
        }, 250);
    }, 3500);
}

function formatNumber(value) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString();
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(
            String(value)
        );
    }

    return escapeHtml(
        date.toLocaleString()
    );
}

function capitalize(value) {
    if (!value) return "";

    return String(value)
        .charAt(0)
        .toUpperCase() +
        String(value)
            .slice(1);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

window.navigate = navigate;
window.loadDashboardData = loadDashboardData;
window.toggleSidebar = toggleSidebar;
window.logout = logout;
window.showCreateGiveawayMessage =
    showCreateGiveawayMessage;