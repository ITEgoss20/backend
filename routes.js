import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import pool from "./db.cjs";
import { formatWhatsAppMessage } from "./helpers.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

// router.post("/store-records", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     // Validate file type (only allow Excel formats)
//     const allowedMimeTypes = [
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
//       "application/vnd.ms-excel", // .xls
//     ];

//     if (!allowedMimeTypes.includes(req.file.mimetype)) {
//       fs.unlinkSync(req.file.path); // Delete invalid file
//       return res.status(400).json({
//         message: "Invalid file format. Upload an Excel file (.xls or .xlsx)",
//       });
//     }

//     // Ensure table exists
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS stock (
//         sr INTEGER,
//         it_code TEXT,
//         supplier TEXT,
//         description TEXT,
//         color TEXT,
//         size TEXT,
//         sel_price NUMERIC(10,2),
//         scan_code BIGINT PRIMARY KEY,
//         stock INT,
//         created_at TIMESTAMP DEFAULT NOW(),
//         updated_at TIMESTAMP DEFAULT NOW()
//       );
//     `);

//     // Read Excel file
//     const filePath = req.file.path;
//     const workbook = XLSX.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     let insertedRecordsCount = 0;
//     let insertedRecords = [];
//     // Process data
//     for (let row of data) {
//       // Validate and parse numeric fields
//       const sr = parseInt(row["Sr."]);
//       const selPrice = parseFloat(row["SelPrice"]);
//       const stock = parseInt(row["Stock"]);
//       const scanCode = parseInt(row["ScanCode"]);

//       if (isNaN(scanCode) || isNaN(sr) || isNaN(selPrice) || isNaN(stock)) {
//         continue;
//       }
//       // Insert query
//       const result = await pool.query(
//         `INSERT INTO stock (sr, it_code, supplier, description, color, size, sel_price, scan_code, stock, created_at, updated_at)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
//          ON CONFLICT (scan_code) DO NOTHING
//          RETURNING *;`,
//         [
//           sr,
//           row["It.Code"],
//           row["Supplier :"],
//           row["Description"],
//           row["Color"],
//           row["Size"],
//           selPrice,
//           scanCode,
//           stock,
//         ]
//       );

//       // Only count rows that were actually inserted
//       if (result.rowCount > 0) {
//         insertedRecordsCount += result.rowCount; // Increment count
//         insertedRecords.push(...result.rows); // Store newly inserted records
//       }
//     }

//     res.json({
//       message: "File uploaded and data stored successfully",
//       recordsInserted: insertedRecordsCount,
//       insertedRecords,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// router.post("/compare-excel-db", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     // Read Excel file
//     const workbook = XLSX.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     // Extract scan_code values from Excel
//     const excelScanCodes = new Set(sheetData.map((row) => row.ScanCode));

//     const dbResult = await pool.query("SELECT * FROM stock");
//     const dbRecords = dbResult.rows;

//     // Find records in DB but NOT in Excel
//     const missingRecords = dbRecords.filter(
//       (record) => !excelScanCodes.has(record.scan_code)
//     );

//     res.json({ missingNumberCount: missingRecords.length, missingRecords });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.post("/upload-and-compare", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Validate file type
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: "Invalid file format. Upload an Excel file (.xls or .xlsx)",
      });
    }

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock (
        sr INTEGER,
        it_code TEXT,
        supplier TEXT,
        description TEXT,
        color TEXT,
        size TEXT,
        sel_price NUMERIC(10,2),
        scan_code BIGINT PRIMARY KEY,
        stock INT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Extract scan_code values from Excel
    const excelScanCodes = new Set(
      sheetData.map((row) => String(row.ScanCode).trim())
    );

    // Fetch all records from DB
    const dbResult = await pool.query("SELECT * FROM stock");
    const dbRecords = dbResult.rows;

    // Find missing records (Present in DB but not in Excel)
    const missingRecords = dbRecords.filter(
      (record) => !excelScanCodes.has(String(record.scan_code).trim())
    );

    // console.log(missingRecords);
    let insertedRecordsCount = 0;
    let insertedRecords = [];

    // Insert new records from Excel into DB
    for (let row of sheetData) {
      const sr = parseInt(row["Sr."]);
      const selPrice = parseFloat(row["SelPrice"]);
      const stock = parseInt(row["Stock"]);
      const scanCode = parseInt(row["ScanCode"]);

      if (isNaN(scanCode) || isNaN(sr) || isNaN(selPrice) || isNaN(stock)) {
        continue;
      }

      const result = await pool.query(
        `INSERT INTO stock (sr, it_code, supplier, description, color, size, sel_price, scan_code, stock, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT (scan_code) DO NOTHING
         RETURNING *;`,
        [
          sr,
          row["It.Code"],
          row["Supplier :"],
          row["Description"],
          row["Color"],
          row["Size"],
          selPrice,
          scanCode,
          stock,
        ]
      );
      if (result.rowCount > 0) {
        insertedRecordsCount += result.rowCount;
        insertedRecords.push(...result.rows);
      }
    }

    const formattedMessage = formatWhatsAppMessage(
      insertedRecords,
      missingRecords
    );

    // Generate WhatsApp link
    const whatsappURL = `https://web.whatsapp.com/send/?phone=918850513009&text=${formattedMessage}`;

    res.json({
      message: "File uploaded and processed successfully",
      recordsInserted: insertedRecordsCount,
      insertedRecords,
      missingRecordsCount: missingRecords.length,
      missingRecords,
      whatsappLink: whatsappURL,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/read-excel", upload.single("file"), async (req, res) => {
  try {
    // Step 1: Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Step 2: Read and parse the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON

    // Step 3: Extract scan_code from request body
    const { scan_code } = req.body;
    if (!scan_code) {
      return res.status(400).json({ message: "Scan code is required" });
    }

    // Step 4: Search for the scan code in Excel data
    const foundRecord = sheetData.find(
      (row) => String(row.ScanCode).trim() === String(scan_code).trim()
    );

    // Step 5: Return result
    if (foundRecord) {
      return res.json({ message: "Record found", record: foundRecord });
    } else {
      return res
        .status(404)
        .json({ message: `Record not found with scan code: ${scan_code}` });
    }
  } catch (error) {
    console.error("Error reading Excel file:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/get-records", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM stock ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
