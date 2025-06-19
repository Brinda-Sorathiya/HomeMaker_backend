import { sql } from '../config/db.js';
import { tableExists } from './tableUtils.js';

// Tables required for Review
const Review_TABLES = ['review'];

// Function to create Review tables if they don't exist
async function createReviewTableIfNotExists(tableName) {
    const exists = await tableExists(tableName);
    if (!exists) {
        try {
            switch (tableName) {
                case 'review':
                    await sql`
                        CREATE TABLE Review (
                            User_Id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
                            Ratings DECIMAL(2,1) NOT NULL,
                            Comments TEXT,
                            PRIMARY KEY (User_Id, Property_Id)
                        );
                    `;
                    break;
            }
            console.log(`Table ${tableName} created successfully`);
        } catch (error) {
            console.error(`Error creating table ${tableName}:`, error);
            throw error;
        }
    }
}

// Middleware to check and create Review tables
export const checkReviewTables = async (req, res, next) => {
    try {
        for (const table of Review_TABLES) {
            await createReviewTableIfNotExists(table);
        }
        next();
    } catch (error) {
        console.error('Error in checkReviewTables middleware:', error);
        res.status(500).json({ message: 'Database error' });
    }
}; 