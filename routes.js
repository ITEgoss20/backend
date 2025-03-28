import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import pool from "./db.cjs";
import { formatWhatsAppMessage } from "./helpers.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const upload = multer({ dest: "uploads/" });

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
          row["Colour"],
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

    fs.unlinkSync(req.file.path);
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

router.delete("/delete-stock-table", async (req, res) => {
  try {
    const result = await pool.query("DROP TABLE IF EXISTS stock;");
    res
      .status(200)
      .json({ message: 'Table "stock" has been deleted (if it existed).' });
  } catch (err) {
    console.error("Error deleting table:", err);
    res.status(500).json({ error: "Failed to delete the table." });
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
    // Fetch stock data with a limit of 12
    const result = await pool.query("SELECT * FROM stock LIMIT 25");
    res.json({
      message: "Stock data fetched successfully",
      records: result.rows,
    });
  } catch (error) {
    console.error("Error fetching stock data:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/get-last-record", async (req, res) => {
  try {
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'stock'
      ) AS table_exists;
    `;

    const { rows: tableCheckRows } = await pool.query(tableCheckQuery);
    const tableExists = tableCheckRows[0]?.table_exists;

    if (!tableExists) {
      return res.json({});
    }

    // Fetch the latest record if the table exists
    const query = "SELECT * FROM stock ORDER BY created_at DESC LIMIT 1";
    const { rows } = await pool.query(query);

    return res.json(rows[0] || {});
  } catch (error) {
    console.error("Error fetching latest record:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
