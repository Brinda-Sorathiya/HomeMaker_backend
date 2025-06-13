import { sql } from '../config/db.js';
import { tableExists } from './tableUtils.js';

// Tables required for property
const PROPERTY_TABLES = ['amenities', 'property', 'property_image', 'rent', 'sell', 'facility'];

// Function to create property tables if they don't exist
async function createPropertyTableIfNotExists(tableName) {
    const exists = await tableExists(tableName);
    if (!exists) {
        try {
            switch (tableName) {
                case 'amenities':
                    await sql`
                        CREATE TABLE Amenities(
                            Amenity_name VARCHAR(30) PRIMARY KEY
                        );
                    `;
                    await sql`
                        INSERT INTO Amenities (Amenity_name)
                        VALUES 
                            ('Wi-Fi'),
                            ('Parking'),
                            ('Swimming Pool'),
                            ('Gym'),
                            ('Air Conditioning'),
                            ('Elevator'),
                            ('Pet Friendly'),
                            ('Laundry'),
                            ('Security'),
                            ('Balcony')
                        ON CONFLICT (Amenity_name) DO NOTHING;
                    `;

                    break;
                case 'property':
                    // await sql`
                    //     CREATE TYPE property_status AS ENUM ('Available', 'Sold', 'Rented', 'Unavailable');
                    // `;
                    // await sql`
                    //     CREATE TYPE available_enum AS ENUM ('Rent', 'Sell', 'Both');
                    // `;
                    await sql`
                        CREATE TABLE Property (
                            APN BIGINT PRIMARY KEY,
                            Built_Year INTEGER NOT NULL,
                            Status property_status NOT NULL,
                            Map_Url TEXT,
                            Area DECIMAL(6,2) NOT NULL,  --(In sq. feet)
                            State VARCHAR(255) NOT NULL,
                            City VARCHAR(255) NOT NULL,
                            District VARCHAR(255) NOT NULL,
                            Local_address VARCHAR(255) NOT NULL,
                            Pincode INTEGER NOT NULL,
                            Neighborhood_info TEXT NOT NULL,
                            Title VARCHAR(255) NOT NULL,  --stores the name of the property
                            Available_For available_enum,
                            Type TEXT NOT NULL,
                            Tour_URL TEXT,
                            Owner_id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE SET NULL,
                            CONSTRAINT unique_constraint UNIQUE(State,City,District,Local_address,Pincode)
                        )
                    `;
                    await sql`
                        CREATE TABLE Individual_amenities(
                            Property_Id BIGINT REFERENCES Property(APN),
                            Amenity_name VARCHAR(255) REFERENCES Amenities(Amenity_name),
                            PRIMARY KEY (Property_Id, Amenity_name)
                        );
                    `;
                    await sql`
                        CREATE TABLE Shared_amenities(
                            Property_Id BIGINT REFERENCES Property(APN),
                            Amenity_name VARCHAR(255) REFERENCES Amenities(Amenity_name),
                            PRIMARY KEY(Property_Id,Amenity_name)
                        );
                    `;
                    
                    break;
                case 'facility' : 
                    await sql`
                        CREATE TABLE facility(
                            Floor_No BIGINT NOT NULL,
                            Hall_No INT NOT NULL,
                            Kitchen_No INT NOT NULL,
                            Bath_No INT NOT NULL,
                            Bedroom_No INT NOT NULL,
                            Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
                            PRIMARY KEY(Property_Id,Floor_No)
                        )`;
                    break;
                case 'property_image':
                    await sql`
                        CREATE TABLE Property_Image (
                            Image_Url TEXT PRIMARY KEY,
                            Description TEXT,       
                            Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT
                        );
                    `;
                    break;
                case 'rent':
                    await sql`
                        CREATE TABLE Rent (
                            Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
                            Owner_id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            PRIMARY KEY(Property_Id,Owner_id),
                            Monthly_Rent INTEGER NOT NULL,
                            Security_Deposit INTEGER NOT NULL,
                            Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE SET NULL
                        );
                    `;
                    break;
                case 'sell':
                    await sql`
                        CREATE TABLE IF NOT EXISTS Sell (
                            Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
                            Owner_id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            PRIMARY KEY(Property_Id,Owner_id),
                            Price BIGINT NOT NULL,
                            Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE SET NULL
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

// Middleware to check and create property tables
export const checkPropertyTables = async (req, res, next) => {
    try {
        for (const table of PROPERTY_TABLES) {
            await createPropertyTableIfNotExists(table);
        }
        next();
    } catch (error) {
        console.error('Error in checkPropertyTables middleware:', error);
        res.status(500).json({ message: 'Database error' });
    }
}; 