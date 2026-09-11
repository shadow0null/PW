const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'submissions.db'), (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            teacher TEXT,
            batch TEXT,
            state TEXT,
            phone TEXT,
            email TEXT,
            note TEXT,
            imageFilename TEXT,
            imageUrl TEXT
        )`);
    }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// Setup storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to restrict file types to images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

// API Endpoint to handle form submission
app.post('/api/submit', upload.single('image'), (req, res) => {
    try {
        const { teacher, batch, state, phone, email, note } = req.body;

        if (!teacher || !batch || !state || !email || !req.file) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const timestamp = new Date().toISOString();
        const imageFilename = req.file.filename;
        const imageUrl = `/uploads/${imageFilename}`;
        const phoneVal = phone || "";
        const noteVal = note || "";

        const sql = `INSERT INTO submissions (timestamp, teacher, batch, state, phone, email, note, imageFilename, imageUrl)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [timestamp, teacher, batch, state, phoneVal, email, noteVal, imageFilename, imageUrl];

        db.run(sql, params, function(err) {
            if (err) {
                console.error("Database insert error: ", err);
                return res.status(500).json({ success: false, message: "Internal server error saving to database" });
            }

            const submission = {
                id: this.lastID,
                timestamp, teacher, batch, state, phone: phoneVal, email, note: noteVal, imageFilename, imageUrl
            };

            res.json({ success: true, message: "Request submitted successfully", data: submission });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
