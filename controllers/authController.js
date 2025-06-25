import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '../config/db.js';
import mailService from '../services/mailService.js';

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        userType,
        contactNo,
        // Organization specific fields
        officeName,
        officeAddress,
        officeContacts,
        // Agent specific field
        licenseNo
      } = req.body;

      // Check if user already exists
      const existingUser = await sql`
        SELECT * FROM Users WHERE Email = ${email}
      `;

      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate user ID
      const userId = uuidv4().substring(0, 10);

      // Start a transaction
      await sql`BEGIN`;

      try {
        // Insert new user
        await sql`
          INSERT INTO Users (User_Id, Name, Email, Password, User_Type, Contact_No)
          VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, ${userType}, ${contactNo})
        `;

        // Handle organization registration
        if (userType === 'Organization') {
          // Insert firm details
          await sql`
            INSERT INTO Firms (User_Id, Office_Name, Office_Address)
            VALUES (${userId}, ${officeName}, ${officeAddress})
          `;

          // Insert firm contacts
          for (const contact of officeContacts) {
            await sql`
              INSERT INTO Firm_Contact (User_Id, Office_Contact)
              VALUES (${userId}, ${contact})
            `;
          }
        }

        // Handle agent registration
        if (userType === 'Agent') {
          // Check if license number already exists
          const existingLicense = await sql`
            SELECT * FROM Agent WHERE Licence_no = ${licenseNo}
          `;

          if (existingLicense.length > 0) {
            throw new Error('License number already registered');
          }

          // Insert agent details
          await sql`
            INSERT INTO Agent (Licence_no, User_Id)
            VALUES (${licenseNo}, ${userId})
          `;
        }

        // Commit transaction
        await sql`COMMIT`;

        // Send welcome email
        await mailService.sendWelcomeEmail(name, email);

        // Create JWT token for the new user
        const token = jwt.sign(
          { userId: userId, userType: userType },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Prepare user object for response
        const userObj = {
          id: userId,
          name,
          email,
          userType,
          contactNo
        };

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: userObj
        });
      } catch (error) {
        // Rollback transaction on error
        await sql`ROLLBACK`;
        throw error;
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: error.message === 'License number already registered'
          ? error.message
          : 'Server error'
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const users = await sql`
        SELECT * FROM Users WHERE Email = ${email}
      `;

      if (users.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = users[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: user.user_id, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          userType: user.user_type,
          contactNo: user.contact_no
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get user data from token
  getUserFromToken: async (req, res) => {
    try {
      const userId = req.user.userId.trim();

      // Get basic user data
      const user = await sql`
        SELECT User_Id, Name, Email, User_Type, Contact_No
        FROM Users 
        WHERE User_Id = ${userId}
      `;

      if (!user || user.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = user[0];

      let additionalData = {};

      // Get additional data based on user type
      if (userData.user_type === 'Agent') {
        const [agentData] = await sql`
          SELECT Licence_no
          FROM Agent 
          WHERE User_Id = ${userId}
        `;
        additionalData = { licenseNo: agentData?.licence_no };
      } else if (userData.user_type === 'Organization') {
        // First check if firm exists

        const firmData = await sql`
            SELECT office_name, office_address
            FROM firms 
            WHERE user_id = ${userId}
          `;
          
        const data = firmData[0];

        const firmContacts = await sql`
            SELECT office_contact
            FROM firm_contact 
            WHERE user_id = ${userId}
          `;

        additionalData = {
          officeName: data?.office_name || null,
          officeAddress: data?.office_address || null,
          officeContacts: firmContacts?.map(contact => contact.office_contact) || []
        };

      }

      const responseData = {
        user: {
          id: userData.user_id,
          name: userData.name,
          email: userData.email,
          userType: userData.user_type,
          contactNo: userData.contact_no,
          ...additionalData
        }
      };

      res.json(responseData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: 'Failed to fetch user data' });
    }
  },

  // Update user profile
  updateUser: async (req, res) => {
    try {
      const userId = req.user.userId.trim();
      const { name, email, contactNo, officeName, officeAddress, officeContacts } = req.body;

      // Check if email is being changed and if it's already taken
      if (email) {
        const existingUser = await sql`
          SELECT * FROM Users 
          WHERE Email = ${email} AND User_Id != ${userId}
        `;

        if (existingUser.length > 0) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Start transaction
      await sql`BEGIN`;

      try {
        // Update user details
        await sql`
          UPDATE Users 
          SET 
            Name = COALESCE(${name}, Name),
            Email = COALESCE(${email}, Email),
            Contact_No = COALESCE(${contactNo}, Contact_No)
          WHERE User_Id = ${userId}
        `;

        // Update firm details if user is an organization
        const [user] = await sql`SELECT User_Type FROM Users WHERE User_Id = ${userId}`;

        if (user.user_type === 'Organization') {
          if (officeName || officeAddress) {
            await sql`
              UPDATE Firms 
              SET 
                Office_Name = COALESCE(${officeName}, Office_Name),
                Office_Address = COALESCE(${officeAddress}, Office_Address)
              WHERE User_Id = ${userId}
            `;
          }

          // Update firm contacts if provided
          if (officeContacts && Array.isArray(officeContacts)) {
            // Delete existing contacts
            await sql`DELETE FROM Firm_Contact WHERE User_Id = ${userId}`;

            // Insert new contacts
            for (const contact of officeContacts) {
              await sql`
                INSERT INTO Firm_Contact (User_Id, Office_Contact)
                VALUES (${userId}, ${contact})
              `;
            }
          }
        }

        await sql`COMMIT`;

        // Get updated user data with all details
        const [updatedUser] = await sql`
          SELECT User_Id, Name, Email, User_Type, Contact_No
          FROM Users 
          WHERE User_Id = ${userId}
        `;

        let additionalData = {};

        if (updatedUser.user_type === 'Agent') {
          const [agentData] = await sql`
            SELECT Licence_no
            FROM Agent 
            WHERE User_Id = ${userId}
          `;
          additionalData = { licenseNo: agentData?.licence_no };
        } else if (updatedUser.user_type === 'Organization') {
          const [firmData] = await sql`
            SELECT Office_Name, Office_Address
            FROM Firms 
            WHERE User_Id = ${userId}
          `;

          const data = firmData[0];

          const firmContacts = await sql`
            SELECT Office_Contact
            FROM Firm_Contact 
            WHERE User_Id = ${userId}
          `;

          additionalData = {
            officeName: data?.office_name || null,
            officeAddress: data?.office_address || null,
            officeContacts: firmContacts?.map(contact => contact.office_contact) || []
          };
        }

        res.json({
          message: 'Profile updated successfully',
          user: {
            id: updatedUser.user_id,
            name: updatedUser.name,
            email: updatedUser.email,
            userType: updatedUser.user_type,
            contactNo: updatedUser.contact_no,
            ...additionalData
          }
        });
      } catch (error) {
        await sql`ROLLBACK`;
        throw error;
      }
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
};

export default authController; 