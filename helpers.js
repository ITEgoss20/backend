export const formatWhatsAppMessage = (insertedRecords, missingRecords) => {
  let message = `*File Uploaded Successfully*\n\n`;
  message += `*Summary:*\n`;
  message += `-----------------------------\n`;
  message += `*Records Inserted:* ${insertedRecords.length}\n`;
  message += `*Missing Records:* ${missingRecords.length}\n\n`;

  // Inserted Records
  if (insertedRecords.length === 0) {
    message += `*Newly Stock (In):* None\n\n`;
  } else {
    message += `*Newly Stock (In):*\n`;
    message += `Sr No.  |  Scan Code\n`;
    message += `----------------------\n`;
    insertedRecords.forEach((record, index) => {
      message += ` ${(index + 1).toString().padEnd(6)}    |   ${
        record.scan_code
      }\n`;
    });
    message += `\n`;
  }

  // Missing Records
  if (missingRecords.length === 0) {
    message += `*Stock Sold (Out):* None\n`;
  } else {
    message += `*Stock Sold (Out):*\n`;
    message += `Sr No.  |  Scan Code\n`;
    message += `----------------------\n`;
    missingRecords.forEach((record, index) => {
      message += ` ${(index + 1).toString().padEnd(6)}    |   ${
        record.scan_code
      }\n`;
    });
  }

  return encodeURIComponent(message);
};
