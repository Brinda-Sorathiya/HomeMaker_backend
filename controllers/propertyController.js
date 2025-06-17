import { sql } from '../config/db.js';
import crypto from 'crypto';

const propertyController = {
  // Get all amenities
  getAmenities: async (req, res) => {
    try {
      const amenities = await sql`
        SELECT Amenity_name FROM Amenities
      `;
      res.json(amenities.map(row => row.amenity_name));
    } catch (error) {
      console.error('Error fetching amenities:', error);
      res.status(500).json({ message: 'Failed to fetch amenities' });
    }
  },

  // Get properties by owner ID
  getPropertiesByOwner: async (req, res) => {
    try {
      const { ownerId } = req.params;

      const properties = await sql`
        SELECT 
          p.*,
          COALESCE(r.Monthly_Rent, 0) as Monthly_Rent,
          COALESCE(r.Security_Deposit, 0) as Security_Deposit,
          COALESCE(s.Price, 0) as Price,
          u.Email AS owner_email,
          u.Contact_No AS owner_phone_number,
          u.User_Id AS owner_id,
          (
            SELECT json_agg(json_build_object('url', pi.Image_Url, 'description', pi.Description))
            FROM Property_Image pi
            WHERE pi.Property_Id = p.APN
          ) as Images,
          (
            SELECT json_agg(Amenity_name)
            FROM Individual_amenities ia
            WHERE ia.Property_Id = p.APN
          ) as Individual_Amenities,
          (
            SELECT json_agg(Amenity_name)
            FROM Shared_amenities sa
            WHERE sa.Property_Id = p.APN
          ) as Shared_Amenities,
          (
            SELECT json_agg(json_build_object(
              'floorNo', f.Floor_No,
              'hallNo', f.Hall_No,
              'kitchenNo', f.Kitchen_No,
              'bathNo', f.Bath_No,
              'bedroomNo', f.Bedroom_No
            ))
            FROM facility f
            WHERE f.Property_Id = p.APN
          ) as Floors
        FROM Property p
        LEFT JOIN Rent r ON p.APN = r.Property_Id
        LEFT JOIN Sell s ON p.APN = s.Property_Id
        LEFT JOIN Users u ON p.Owner_id = u.User_Id
        WHERE p.Owner_id = ${ownerId}
        ORDER BY p.APN DESC
      `;
      res.json(properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ message: 'Failed to fetch properties' });
    }
  },

  // Get all properties
  getAllProperties: async (req, res) => {
    const {userId} = req.params;
    try {
      const properties = await sql`
        SELECT 
          p.*,
          COALESCE(r.Monthly_Rent, 0) as Monthly_Rent,
          COALESCE(r.Security_Deposit, 0) as Security_Deposit,
          COALESCE(s.Price, 0) as Price,
          u.Email AS owner_email,
          u.Contact_No AS owner_phone_number,
          u.User_Id AS owner_id,
          EXISTS (
            SELECT 1 FROM Wishlist w 
            WHERE w.Property_Id = p.APN AND w.User_Id = ${userId}
          ) as is_wish,
          (
            SELECT json_agg(json_build_object('url', pi.Image_Url, 'description', pi.Description))
            FROM Property_Image pi
            WHERE pi.Property_Id = p.APN
          ) as Images,
          (
            SELECT json_agg(Amenity_name)
            FROM Individual_amenities ia
            WHERE ia.Property_Id = p.APN
          ) as Individual_Amenities,
          (
            SELECT json_agg(Amenity_name)
            FROM Shared_amenities sa
            WHERE sa.Property_Id = p.APN
          ) as Shared_Amenities,
          (
            SELECT json_agg(json_build_object(
              'floorNo', f.Floor_No,
              'hallNo', f.Hall_No,
              'kitchenNo', f.Kitchen_No,
              'bathNo', f.Bath_No,
              'bedroomNo', f.Bedroom_No
            ))
            FROM facility f
            WHERE f.Property_Id = p.APN
          ) as Floors
        FROM Property p
        LEFT JOIN Rent r ON p.APN = r.Property_Id
        LEFT JOIN Sell s ON p.APN = s.Property_Id
        LEFT JOIN Users u ON p.Owner_id = u.User_Id
        ORDER BY p.APN DESC
      `;

      res.json(properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ message: 'Failed to fetch properties' });
    }
  },

  // Generate unique APN
  generateUniqueAPN: async () => {
    // Generate a random 10-digit number
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
    
    // Check if APN already exists
    const existingProperty = await sql`
      SELECT APN FROM Property WHERE APN = ${randomNum}
    `;

    if (existingProperty.length > 0) {
      // If APN exists, recursively generate a new one
      return propertyController.generateUniqueAPN();
    }

    return randomNum;
  },

  // Add new property
  addProperty: async (req, res) => {
    try {
      // Validate owner ID first
      const { ownerId } = req.body;
      
      if (!ownerId) {
        return res.status(400).json({ 
          message: 'Owner ID is required',
          error: 'Missing owner ID'
        });
      }

      // Check if owner exists
      const ownerExists = await sql`
        SELECT User_Id FROM Users WHERE User_Id = ${ownerId}
      `;

      if (ownerExists.length === 0) {
        return res.status(400).json({ 
          message: 'Invalid owner ID',
          error: 'Owner does not exist'
        });
      }

      await sql.query('BEGIN');

      const {
        builtYear,
        status = 'Available',
        mapUrl,
        area,
        state,
        city,
        district,
        localAddress,
        pincode,
        neighborhoodInfo,
        title,
        availableFor,
        type,
        tourUrl,
        // Individual and Shared amenities
        individualAmenities = [],
        sharedAmenities = [],

        // Rent/Sell specific fields
        monthlyRent,
        securityDeposit,
        price,

        // Property Images
        images = [], // Array of { url: string, description: string }

        // Floor facility data
        floors = [], // Array of floor facility data
      } = req.body;

      // Generate unique APN
      const apn = await propertyController.generateUniqueAPN();

      // Insert property
      const [property] = await sql`
        INSERT INTO Property (
          APN, Built_Year, Status, Map_Url, Area, State, City, District, 
          Local_address, Pincode, Neighborhood_info, Title, 
          Available_For, Type, Tour_URL, Owner_id
        ) VALUES (
          ${apn}, ${builtYear}, ${status}, ${mapUrl}, ${area}, ${state}, ${city}, ${district}, 
          ${localAddress}, ${pincode}, ${neighborhoodInfo}, ${title}, 
          ${availableFor}, ${type}, ${tourUrl}, ${ownerId}
        ) RETURNING APN
      `;

      const propertyId = property.apn;

      // Insert floor facility data
      if (floors.length > 0) {
        for (const floor of floors) {
          await sql`
            INSERT INTO facility (
              Floor_No,
              Hall_No,
              Kitchen_No,
              Bath_No,
              Bedroom_No,
              Property_Id
            ) VALUES (
              ${floor.floorNo},
              ${floor.hallNo},
              ${floor.kitchenNo},
              ${floor.bathNo},
              ${floor.bedroomNo},
              ${propertyId}
            )
          `;
        }
      }

      // Insert individual amenities
      if (individualAmenities.length > 0) {
        for (const amenity of individualAmenities) {
          await sql`
            INSERT INTO Individual_amenities (Property_Id, Amenity_name)
            VALUES (${propertyId}, ${amenity})
          `;
        }
      }

      // Insert shared amenities
      if (sharedAmenities.length > 0) {
        for (const amenity of sharedAmenities) {
          await sql`
            INSERT INTO Shared_amenities (Property_Id, Amenity_name)
            VALUES (${propertyId}, ${amenity})
          `;
        }
      }

      // Insert property images
      if (images.length > 0) {
        for (const image of images) {
          await sql`
            INSERT INTO Property_Image (Image_Url, Description, Property_Id)
            VALUES (${image.url}, ${image.description}, ${propertyId})
          `;
        }
      }

      // Insert rent information if applicable
      if (availableFor === 'Rent' || availableFor === 'Both') {
        if (!monthlyRent || !securityDeposit) {
          throw new Error('Monthly rent and security deposit are required for rental properties');
        }
        await sql`
          INSERT INTO Rent (Property_Id, Owner_id, Monthly_Rent, Security_Deposit)
          VALUES (${propertyId}, ${ownerId}, ${monthlyRent}, ${securityDeposit})
        `;
      }

      // Insert sell information if applicable
      if (availableFor === 'Sell' || availableFor === 'Both') {
        if (!price) {
          throw new Error('Price is required for properties for sale');
        }
        await sql`
          INSERT INTO Sell (Property_Id, Owner_id, Price)
          VALUES (${propertyId}, ${ownerId}, ${price})
        `;
      }

      await sql.query('COMMIT');

      res.status(201).json({ 
        message: 'Property added successfully', 
        propertyId,
        apn
      });
    } catch (error) {
      await sql.query('ROLLBACK');
      console.error('Error adding property:', error);
      res.status(500).json({ 
        message: 'Failed to add property',
        error: error.message 
      });
    }
  },

  // Update property
  updateProperty: async (req, res) => {
    try {
      const { apn } = req.params;
      const {
        built_year,
        map_url,
        area,
        state,
        city,
        district,
        local_address,
        pincode,
        neighborhood_info,
        title,
        available_for,
        type,
        tour_url,
        individual_amenities = [],
        shared_amenities = [],
        monthly_rent,
        security_deposit,
        price,
        images = [],
        floors = [],
      } = req.body;

      await sql.query('BEGIN');

      // 1. Update Property table
      await sql`
        UPDATE Property
        SET
          Built_Year = ${built_year},
          Map_Url = ${map_url},
          Area = ${area},
          State = ${state},
          City = ${city},
          District = ${district},
          Local_address = ${local_address},
          Pincode = ${pincode},
          Neighborhood_info = ${neighborhood_info},
          Title = ${title},
          Available_For = ${available_for},
          Type = ${type},
          Tour_URL = ${tour_url}
        WHERE APN = ${apn}
      `;

      // 2. Handle Floors (delete existing, then insert new)
      await sql`
        DELETE FROM facility WHERE Property_Id = ${apn}
      `;
      if (floors.length > 0) {
        for (const floor of floors) {
          await sql`
            INSERT INTO facility (
              Floor_No,
              Hall_No,
              Kitchen_No,
              Bath_No,
              Bedroom_No,
              Property_Id
            ) VALUES (
              ${floor.floorNo},
              ${floor.hallNo},
              ${floor.kitchenNo},
              ${floor.bathNo},
              ${floor.bedroomNo},
              ${apn}
            )
          `;
        }
      }

      // 3. Handle Individual Amenities (delete existing, then insert new)
      await sql`
        DELETE FROM Individual_amenities WHERE Property_Id = ${apn}
      `;
      if (individual_amenities.length > 0) {
        for (const amenity of individual_amenities) {
          await sql`
            INSERT INTO Individual_amenities (Property_Id, Amenity_name)
            VALUES (${apn}, ${amenity})
          `;
        }
      }

      // 4. Handle Shared Amenities (delete existing, then insert new)
      await sql`
        DELETE FROM Shared_amenities WHERE Property_Id = ${apn}
      `;
      if (shared_amenities.length > 0) {
        for (const amenity of shared_amenities) {
          await sql`
            INSERT INTO Shared_amenities (Property_Id, Amenity_name)
            VALUES (${apn}, ${amenity})
          `;
        }
      }

      // 5. Handle Property Images (delete existing, then insert new)
      await sql`
        DELETE FROM Property_Image WHERE Property_Id = ${apn}
      `;
      if (images.length > 0) {
        for (const image of images) {
          await sql`
            INSERT INTO Property_Image (Image_Url, Description, Property_Id)
            VALUES (${image.url}, ${image.description}, ${apn})
          `;
        }
      }

      // 6. Handle Rent/Sell information
      if (available_for === 'Rent' || available_for === 'Both') {
        if (!monthly_rent || !security_deposit) {
          throw new Error('Monthly rent and security deposit are required for rental properties');
        }
        await sql`
          INSERT INTO Rent (Property_Id, Monthly_Rent, Security_Deposit, Owner_id)
          VALUES (${apn}, ${monthly_rent}, ${security_deposit}, (SELECT Owner_id FROM Property WHERE APN = ${apn}))
          ON CONFLICT (Property_Id, Owner_id) DO UPDATE SET
            Monthly_Rent = EXCLUDED.Monthly_Rent,
            Security_Deposit = EXCLUDED.Security_Deposit
        `;
      } else {
        // If not available for rent, delete existing rent entry
        await sql`
          DELETE FROM Rent WHERE Property_Id = ${apn}
        `;
      }

      if (available_for === 'Sell' || available_for === 'Both') {
        if (!price) {
          throw new Error('Price is required for properties for sale');
        }
        await sql`
          INSERT INTO Sell (Property_Id, Price, Owner_id)
          VALUES (${apn}, ${price}, (SELECT Owner_id FROM Property WHERE APN = ${apn}))
          ON CONFLICT (Property_Id, Owner_id) DO UPDATE SET
            Price = EXCLUDED.Price
        `;
      } else {
        // If not available for sell, delete existing sell entry
        await sql`
          DELETE FROM Sell WHERE Property_Id = ${apn}
        `;
      }

      await sql.query('COMMIT');

      res.status(200).json({ message: 'Property updated successfully', apn });

    } catch (error) {
      await sql.query('ROLLBACK');
      console.error('Error updating property:', error);
      res.status(500).json({
        message: 'Failed to update property',
        error: error.message
      });
    }
  },

  // Add to wishlist
  addToWishlist: async (req, res) => {
    try {
      const { propertyId, userId } = req.body;
      
      const property = await sql`
        SELECT * FROM Property WHERE APN = ${propertyId}
      `;

      if (property.length === 0) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Add to wishlist
      await sql`
        INSERT INTO Wishlist (User_Id, Property_Id)
        VALUES (${uid}, ${propertyId})
        ON CONFLICT (User_Id, Property_Id) DO NOTHING
      `;

      res.status(200).json({ message: 'Added to wishlist successfully' });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      res.status(500).json({ message: 'Failed to add to wishlist' });
    }
  },

  // Remove from wishlist
  removeFromWishlist: async (req, res) => {
    try {
      const { propertyId, userId } = req.params;

      const uid = userId.trim();
      await sql`
        DELETE FROM Wishlist 
        WHERE user_Id = ${uid} AND property_Id = ${propertyId}
      `;

      res.status(200).json({ message: 'Removed from wishlist successfully' });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({ message: 'Failed to remove from wishlist' });
    }
  },

  // Get wishlist
  getWishlist: async (req, res) => {
    try {
      const {userId} = req.params;
      // console.log(userId)
      const wishlist = await sql`
        SELECT 
          p.*,
          COALESCE(r.Monthly_Rent, 0) as Monthly_Rent,
          COALESCE(r.Security_Deposit, 0) as Security_Deposit,
          COALESCE(s.Price, 0) as Price,
          u.Email AS owner_email,
          u.Contact_No AS owner_phone_number,
          u.User_Id AS owner_id,
          (
            SELECT json_agg(json_build_object('url', pi.Image_Url, 'description', pi.Description))
            FROM Property_Image pi
            WHERE pi.Property_Id = p.APN
          ) as Images,
          (
            SELECT json_agg(Amenity_name)
            FROM Individual_amenities ia
            WHERE ia.Property_Id = p.APN
          ) as Individual_Amenities,
          (
            SELECT json_agg(Amenity_name)
            FROM Shared_amenities sa
            WHERE sa.Property_Id = p.APN
          ) as Shared_Amenities,
          (
            SELECT json_agg(json_build_object(
              'floorNo', f.Floor_No,
              'hallNo', f.Hall_No,
              'kitchenNo', f.Kitchen_No,
              'bathNo', f.Bath_No,
              'bedroomNo', f.Bedroom_No
            ))
            FROM facility f
            WHERE f.Property_Id = p.APN
          ) as Floors
        FROM Wishlist w
        JOIN Property p ON w.Property_Id = p.APN
        LEFT JOIN Rent r ON p.APN = r.Property_Id
        LEFT JOIN Sell s ON p.APN = s.Property_Id
        LEFT JOIN Users u ON p.Owner_id = u.User_Id
        WHERE w.User_Id = ${userId}
        ORDER BY p.APN DESC
      `;

      // console.log('Wishlist query result:', wishlist);
      res.json(wishlist);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
  }
};

export default propertyController; 