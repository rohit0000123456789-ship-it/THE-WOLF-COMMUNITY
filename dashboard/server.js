import "dotenv/config";
import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = Number(process.env.DASHBOARD_PORT || 3000);

const BOT_API =
  process.env.BOT_API_URL || "http://localhost:3001";

const DASHBOARD_USERNAME =
  String(process.env.DASHBOARD_USERNAME || "admin").trim();

const DASHBOARD_PASSWORD =
  String(
    process.env.DASHBOARD_PASSWORD || "WolfAdmin@2026"
  );

const SESSION_SECRET =
  process.env.DASHBOARD_SESSION_SECRET ||
  "wolf-super-secret-change-this";

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
);

/* =========================================================
   STATIC FILES
========================================================= */

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

/* =========================================================
   HELPERS
========================================================= */

function safeCompare(a, b) {
  const aBuffer = Buffer.from(String(a), "utf8");
  const bBuffer = Buffer.from(String(b), "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    aBuffer,
    bBuffer
  );
}

function isAuthenticated(req) {
  return Boolean(
    req.session &&
    req.session.authenticated === true
  );
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: "Authentication required.",
    });
  }

  return res.redirect("/login");
}

/* =========================================================
   BOT API HELPER
========================================================= */

async function fetchBot(endpoint, options = {}) {
  const response = await fetch(
    `${BOT_API}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      success: response.ok,
      raw: text,
    };
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Bot API returned ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   LOGIN VALUE EXTRACTION
========================================================= */

function getLoginUsername(body = {}) {
  return String(
    body.username ??
    body.loginId ??
    body.login ??
    body.identifier ??
    body.user ??
    ""
  ).trim();
}

function getLoginPassword(body = {}) {
  return String(
    body.password ??
    body.pass ??
    body.passcode ??
    ""
  );
}

/* =========================================================
   LOGIN HANDLER
========================================================= */

function handleLogin(req, res) {
  const username = getLoginUsername(req.body);
  const password = getLoginPassword(req.body);

  console.log("");
  console.log("========== DASHBOARD LOGIN ==========");
  console.log(
    "Received Login ID:",
    username || "(empty)"
  );
  console.log(
    "Username matched:",
    safeCompare(
      username,
      DASHBOARD_USERNAME
    )
  );
  console.log(
    "Password matched:",
    safeCompare(
      password,
      DASHBOARD_PASSWORD
    )
  );
  console.log("=====================================");
  console.log("");

  const usernameValid = safeCompare(
    username,
    DASHBOARD_USERNAME
  );

  const passwordValid = safeCompare(
    password,
    DASHBOARD_PASSWORD
  );

  if (!usernameValid || !passwordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid Login ID or Password.",
    });
  }

  req.session.authenticated = true;
  req.session.username = username;
  req.session.loginAt = Date.now();

  return res.json({
    success: true,
    authenticated: true,
    redirect: "/dashboard",
    username,
  });
}

/* =========================================================
   LOGIN ROUTES
========================================================= */

app.get("/", (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect("/dashboard");
  }

  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect("/dashboard");
  }

  return res.sendFile(
    path.join(
      __dirname,
      "public",
      "login.html"
    )
  );
});

/*
   Support BOTH:
   POST /login
   POST /api/login
*/

app.post("/login", handleLogin);

app.post("/api/login", handleLogin);

/* =========================================================
   LOGOUT
========================================================= */

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(
        "SESSION DESTROY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Logout failed.",
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      success: true,
      redirect: "/login",
    });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(
        "SESSION DESTROY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Logout failed.",
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      success: true,
      redirect: "/login",
    });
  });
});

/* =========================================================
   DASHBOARD
========================================================= */

app.get(
  "/dashboard",
  requireAuth,
  (req, res) => {
    return res.sendFile(
      path.join(
        __dirname,
        "public",
        "dashboard.html"
      )
    );
  }
);

/* =========================================================
   AUTH STATUS
========================================================= */

app.get("/api/auth", (req, res) => {
  if (!isAuthenticated(req)) {
    return res.json({
      success: true,
      authenticated: false,
    });
  }

  return res.json({
    success: true,
    authenticated: true,
    username: req.session.username,
    loginAt: req.session.loginAt,
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {
  return res.json({
    success: true,
    dashboard: "online",
    authenticated: isAuthenticated(req),
    time: new Date().toISOString(),
  });
});

/* =========================================================
   BOT API PROXY
========================================================= */

app.get(
  "/api/bot/*splat",
  requireAuth,
  async (req, res) => {
    try {
      const endpoint =
        "/" +
        req.params.splat.join("/");

      const query =
        req.originalUrl.includes("?")
          ? req.originalUrl.slice(
              req.originalUrl.indexOf("?")
            )
          : "";

      const data = await fetchBot(
        `${endpoint}${query}`
      );

      return res.json(data);
    } catch (error) {
      console.error(
        "BOT API ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          "Bot API is offline or unavailable.",
        details: error.message,
      });
    }
  }
);

app.post(
  "/api/bot/*splat",
  requireAuth,
  async (req, res) => {
    try {
      const endpoint =
        "/" +
        req.params.splat.join("/");

      const data = await fetchBot(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify(
            req.body || {}
          ),
        }
      );

      return res.json(data);
    } catch (error) {
      console.error(
        "BOT API POST ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          "Bot API is offline or unavailable.",
        details: error.message,
      });
    }
  }
);

app.patch(
  "/api/bot/*splat",
  requireAuth,
  async (req, res) => {
    try {
      const endpoint =
        "/" +
        req.params.splat.join("/");

      const data = await fetchBot(
        endpoint,
        {
          method: "PATCH",
          body: JSON.stringify(
            req.body || {}
          ),
        }
      );

      return res.json(data);
    } catch (error) {
      console.error(
        "BOT API PATCH ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          "Bot API is offline or unavailable.",
        details: error.message,
      });
    }
  }
);

app.delete(
  "/api/bot/*splat",
  requireAuth,
  async (req, res) => {
    try {
      const endpoint =
        "/" +
        req.params.splat.join("/");

      const data = await fetchBot(
        endpoint,
        {
          method: "DELETE",
          body: JSON.stringify(
            req.body || {}
          ),
        }
      );

      return res.json(data);
    } catch (error) {
      console.error(
        "BOT API DELETE ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          "Bot API is offline or unavailable.",
        details: error.message,
      });
    }
  }
);

/* =========================================================
   LEGACY API
========================================================= */

app.get(
  "/api/bot",
  requireAuth,
  async (req, res) => {
    try {
      const data =
        await fetchBot("/api/health");

      return res.json(data);
    } catch (error) {
      return res.status(502).json({
        success: false,
        error: error.message,
      });
    }
  }
);

app.get(
  "/api/stats",
  requireAuth,
  async (req, res) => {
    try {
      const data =
        await fetchBot("/api/stats");

      return res.json(data);
    } catch {
      return res.json({
        success: false,
        members: 0,
        tickets: 0,
        applications: 0,
        giveaways: 0,
      });
    }
  }
);

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  if (
    req.path.startsWith("/api/")
  ) {
    return res.status(404).json({
      success: false,
      error: "API route not found.",
    });
  }

  return res
    .status(404)
    .send("Page not found.");
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "DASHBOARD ERROR:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      error: "Internal dashboard error.",
    });
  }
);

/* =========================================================
   START
========================================================= */

app.listen(PORT, () => {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "🐺 THE WOLF CONTROL CENTER"
  );
  console.log(
    "========================================"
  );
  console.log(
    `Dashboard: http://localhost:${PORT}`
  );
  console.log(
    `Bot API:   ${BOT_API}`
  );
  console.log(
    "Login authentication: ENABLED"
  );
  console.log(
    `Login ID: ${DASHBOARD_USERNAME}`
  );
  console.log(
    "========================================"
  );
  console.log("");
});