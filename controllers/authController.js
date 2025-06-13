import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '../config/db.js';
import mailService from '../services/mailService.js';

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const { name, email, password, userType, contactNo } = req.body;

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

      // Insert new user
      await sql`
        INSERT INTO Users (User_Id, Name, Email, Password, User_Type, Contact_No)
        VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, ${userType}, ${contactNo})
      `;

      // Send welcome email
      await mailService.sendWelcomeEmail(name, email);

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
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
      const userId = req.user.userId; // Changed from id to userId to match token payload

      const [user] = await sql`
        SELECT User_Id, Name, Email, User_Type, Contact_No
        FROM Users 
        WHERE User_Id = ${userId}
      `;

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          userType: user.user_type,
          contactNo: user.contact_no
        }
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: 'Failed to fetch user data' });
    }
  }
};

export default authController; 