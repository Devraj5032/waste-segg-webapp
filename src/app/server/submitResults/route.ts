import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Create MySQL connection
const db = await mysql.createConnection({
  host: "database-1.c9uqaoa8w1il.us-east-1.rds.amazonaws.com",
  user: "admin",
  password: "Dev3008200210",
  database: "waste_segg"
});

export async function POST(req) {
  const { qrCodeData, predictions, images = [], overallStatus } = await req.json();

  // Check for required fields
  if (!qrCodeData || !overallStatus) {
    return NextResponse.json({ error: 'qrCodeData and overallStatus are required' }, { status: 400 });
  }

  try {
    // Start a transaction
    await db.beginTransaction();

    // Insert house data, with images only if they exist
    const houseQuery = `
      INSERT INTO waste_seggegration_data (house_id, image1, image2, image3, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [houseResult] = await db.execute(houseQuery, [
      qrCodeData,       // Assuming qrCodeData represents house_id
      images[0] || null, // First image, if available
      images[1] || null, // Second image, if available
      images[2] || null, // Third image, if available
      overallStatus      // Status
    ]);

    // Commit the transaction
    await db.commit();

    return NextResponse.json({ message: 'House data added successfully', houseId: houseResult.insertId }, { status: 201 });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.rollback();
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to save house data' }, { status: 500 });
  }
}
