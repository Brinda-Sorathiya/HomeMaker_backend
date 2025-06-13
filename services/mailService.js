import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailService = {
  // Send welcome email after registration
  sendWelcomeEmail: async (name, email) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Our Housing Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Welcome ${name}!</h1>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
              <p style="color: #555; font-size: 16px;">Thank you for registering with our housing platform. We're excited to have you on board!</p>
              <p style="color: #555; font-size: 16px;">You can now start exploring properties and connecting with sellers/agents.</p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}" 
                 style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Start Exploring
              </a>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, resetToken) => {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Password Reset</h1>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
              <p style="color: #555; font-size: 16px;">You requested a password reset. Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #555; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  },

  // Send property inquiry email
  sendPropertyInquiry: async (propertyOwner, inquirer, propertyDetails, message) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: propertyOwner.email,
        subject: 'New Property Inquiry',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">New Property Inquiry</h1>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
              <h2 style="color: #444;">Property Details:</h2>
              <p style="color: #555;">${propertyDetails}</p>
              
              <h2 style="color: #444;">Inquirer Details:</h2>
              <p style="color: #555;">Name: ${inquirer.name}</p>
              <p style="color: #555;">Email: ${inquirer.email}</p>
              <p style="color: #555;">Phone: ${inquirer.contactNo}</p>
              
              <h2 style="color: #444;">Message:</h2>
              <p style="color: #555;">${message}</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending property inquiry email:', error);
      throw error;
    }
  }
};

export default mailService; 