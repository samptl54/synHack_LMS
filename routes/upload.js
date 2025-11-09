import express from "express";
import multer from "multer";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- CONFIG ----------
const CLIENT_ID =
    "985443684341-v59dh3ss71kncd0jlaj0ea8ib4cqhpav.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:3000/upload/oauth2callback";
const DRIVE_FOLDER_ID =
    process.env.DRIVE_FOLDER_ID || "1p44ucNoYkas03_hQZrQoZLmWqtf3d8Rn";
const TOKENS_PATH = path.join(__dirname, "../config/tokens.json");

// Multer temp storage
const upload = multer({ dest: path.join(__dirname, "../uploads/") });

// Scopes we need
const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.metadata",
];

// ---------- OAuth2 client ----------
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Load tokens from disk if present
function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_PATH)) {
            const raw = fs.readFileSync(TOKENS_PATH, "utf8");
            const tokens = JSON.parse(raw);
            return tokens;
        }
    } catch (err) {
        console.error("Failed to load tokens:", err);
    }
    return null;
}

function saveTokens(tokens) {
    try {
        fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
        fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf8");
        console.log("Saved OAuth tokens to", TOKENS_PATH);
    } catch (err) {
        console.error("Failed to save tokens:", err);
    }
}

// If tokens exist on disk, set credentials
const existingTokens = loadTokens();
if (existingTokens) {
    oauth2Client.setCredentials(existingTokens);
}

// ---------- Express router ----------
const router = express.Router();

/**
 * GET /upload/auth
 * Redirects to Google's consent screen. Do this once in browser (admin).
 */
router.get("/auth", (req, res) => {
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline", // gets refresh_token
            prompt: "consent", // force refresh_token on first auth
            scope: SCOPES,
        });
        res.redirect(authUrl);
    } catch (err) {
        console.error("Auth redirect error:", err);
        res.status(500).send("Failed to generate auth URL");
    }
});

/**
 * GET /upload/oauth2callback
 * Google will redirect here with `?code=...`. We exchange code for tokens and persist them.
 */
router.get("/oauth2callback", async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.status(400).send("No code provided");

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        saveTokens(tokens);

        // friendly response
        return res.send(
            `<h2>Authorized ✅</h2><p>You may close this tab. Server has saved credentials and is ready to upload.</p>`
        );
    } catch (err) {
        console.error("OAuth2 callback error:", err);
        return res.status(500).send("Authorization failed");
    }
});

/**
 * POST /upload
 * Upload file (field name "file") to Drive using stored credentials.
 * Response JSON: { success: true, webViewLink, webContentLink, fileId }
 */
router.post("/", upload.single("file"), async (req, res) => {
    try {
        // ensure file present
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded (expect field name 'file')",
            });
        }

        // ensure we have tokens
        const currentCreds = oauth2Client.credentials;
        if (
            !currentCreds ||
            (!currentCreds.access_token && !currentCreds.refresh_token)
        ) {
            return res.status(403).json({
                success: false,
                error: "Server not authorized. Visit /upload/auth and complete authorization in browser.",
            });
        }

        // refresh token if needed (google-auth-library will auto refresh on request)
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Prepare metadata
        const fileMetadata = {
            name: req.file.originalname,
        };
        if (DRIVE_FOLDER_ID) fileMetadata.parents = [DRIVE_FOLDER_ID];

        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(req.file.path),
        };

        // Upload file
        const createRes = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: "id, webViewLink, webContentLink",
            supportsAllDrives: true, // safe for shared drives, harmless otherwise
        });

        // Make the file readable by anyone with link
        await drive.permissions.create({
            fileId: createRes.data.id,
            requestBody: {
                role: "reader",
                type: "anyone",
            },
            supportsAllDrives: true,
        });

        // Cleanup local temp file
        try {
            fs.unlinkSync(req.file.path);
        } catch (e) {
            console.warn("Failed to delete temp file:", e);
        }

        // If tokens have been refreshed during the request, persist them
        if (oauth2Client.credentials) {
            saveTokens(oauth2Client.credentials);
        }

        return res.json({
            success: true,
            fileId: createRes.data.id,
            webViewLink: createRes.data.webViewLink,
            webContentLink: createRes.data.webContentLink,
        });
    } catch (err) {
        console.error("Drive upload error:", err);
        // attempt to provide helpful error details
        const message = err?.response?.data || err.message || String(err);
        return res
            .status(500)
            .json({ success: false, error: "Upload failed", details: message });
    }
});

export default router;
