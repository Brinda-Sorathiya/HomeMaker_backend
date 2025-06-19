import { sql } from '../config/db.js';

// Get reviews for a specific property
export const getMessage = async (req, res) => {
    try {
        const { apn } = req.params;
        
        const reviews = await sql`
            SELECT r.*, u.name
            FROM Review r
            JOIN Users u ON r.User_Id = u.User_Id
            WHERE r.Property_Id = ${apn}
            ORDER BY r.Ratings DESC
        `;
        res.status(200).json(reviews); 
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
};

// Send a new review
export const sendMessage = async (req, res) => {
    try {
        const { propertyId, ratings, comments } = req.body;
        const userId = req.user.userId.trim(); 

        const existingReview = await sql`
            SELECT * FROM Review 
            WHERE User_Id = ${userId} AND Property_Id = ${propertyId}
        `;

        if (existingReview.length > 0) {
            return res.status(400).json({ message: 'You have already reviewed this property' });
        }

        const newReview = await sql`
            INSERT INTO Review (User_Id, Property_Id, Ratings, Comments)
            VALUES (${userId}, ${propertyId}, ${ratings}, ${comments})
            RETURNING *
        `;
        
        res.status(201).json(newReview[0]);
    } catch (error) {
        console.error('Error sending review:', error);
        res.status(500).json({ message: 'Error sending review' });
    }
};

// Edit an existing review
export const editMessage = async (req, res) => {
    try {
        const { propertyId, ratings, comments } = req.body;
        const userId = req.user.userId.trim(); 

        const existingReview = await sql`
            SELECT * FROM Review 
            WHERE User_Id = ${userId} AND Property_Id = ${propertyId}
        `;

        if (existingReview.length === 0) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Update the review
        const updatedReview = await sql`
            UPDATE Review 
            SET Ratings = ${ratings}, Comments = ${comments}
            WHERE User_Id = ${userId} AND Property_Id = ${propertyId}
            RETURNING *
        `;

        res.status(200).json(updatedReview[0]);
    } catch (error) {
        console.error('Error editing review:', error);
        res.status(500).json({ message: 'Error editing review' });
    }
};

export default {
    getMessage,
    sendMessage,
    editMessage
};
