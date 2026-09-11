const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
        const { teacher, batch, state, email, note } = req.body;

        if (!teacher || !batch || !state || !email || !req.file) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const submission = {
            timestamp: new Date().toISOString(),
            teacher,
            batch,
            state,
            email,
            note: note || "",
            imagePath: req.file.path,
            imageFilename: req.file.filename,
            imageUrl: `/uploads/${req.file.filename}`
        };

        const submissionsFile = path.join(__dirname, 'submissions.json');

        let submissions = [];
        if (fs.existsSync(submissionsFile)) {
            const data = fs.readFileSync(submissionsFile, 'utf8');
            try {
                submissions = JSON.parse(data);
            } catch(e) {}
        }

        submissions.push(submission);
        fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

        res.json({ success: true, message: "Request submitted successfully", data: submission });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
