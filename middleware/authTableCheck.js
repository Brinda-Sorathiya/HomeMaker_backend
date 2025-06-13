import { sql } from '../config/db.js';
import { tableExists } from './tableUtils.js';

// Tables required for auth
const AUTH_TABLES = ['users', 'firms', 'agent'];

// Function to create auth tables if they don't exist
async function createAuthTableIfNotExists(tableName) {
    const exists = await tableExists(tableName);
    if (!exists) {
        try {
            switch (tableName) {
                case 'users':
                    await sql`
                        CREATE TABLE Users (
                            User_Id CHAR(255),
                            Name VARCHAR(255) NOT NULL,
                            Email VARCHAR(255) NOT NULL UNIQUE,
                            Password VARCHAR(255) NOT NULL,
                            User_Type VARCHAR(255) NOT NULL, 
                            Contact_No BIGINT NOT NULL,
                            Status VARCHAR(255) NOT NULL DEFAULT 'active',
                            PRIMARY KEY(User_Id)
                        )
                    `;
                    break;
                case 'firms':
                    await sql`
                            CREATE TABLE IF NOT EXISTS Firms (
                                User_Id VARCHAR(255) PRIMARY KEY REFERENCES Users(User_Id) ON DELETE RESTRICT ON UPDATE CASCADE,
                                Office_Name TEXT NOT NULL,
                                Office_Address TEXT NOT NULL UNIQUE
                            );
                        `;
                    await sql`
                            CREATE TABLE IF NOT EXISTS Firm_Contact(
                                User_Id VARCHAR(255) REFERENCES Firms(User_Id) ON UPDATE CASCADE ON DELETE CASCADE,
                                Office_Contact BIGINT NOT NULL,
                                PRIMARY KEY (User_Id,Office_Contact)
                            );
                        `;
                    break;
                case 'agent':
                    await sql`
                                CREATE TABLE IF NOT EXISTS Agent (
                                    Licence_no BIGINT PRIMARY KEY,
                                    User_Id VARCHAR(255) REFERENCES Users(User_Id) ON DELETE RESTRICT ON UPDATE CASCADE
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

// Middleware to check and create auth tables
export const checkAuthTables = async (req, res, next) => {
    try {
        for (const table of AUTH_TABLES) {
            await createAuthTableIfNotExists(table);
        }
        next();
    } catch (error) {
        console.error('Error in checkAuthTables middleware:', error);
        res.status(500).json({ message: 'Database error' });
    }
}; 