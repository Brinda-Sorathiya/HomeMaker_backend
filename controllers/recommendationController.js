import { sql } from '../config/db.js';

export const getRecommendations = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const propertyIdInt = parseInt(propertyId, 10);

        // 1. Get current property details (district, society, amenities, floor, price/rent, available_for)
        const [current] = await sql`
            SELECT p.District, p.APN, p.Type, p.Available_For,
                (SELECT array_agg(ia.Amenity_name) FROM Individual_amenities ia WHERE ia.Property_Id = p.APN) as ind_amenities,
                (SELECT array_agg(sa.Amenity_name) FROM Shared_amenities sa WHERE sa.Property_Id = p.APN) as shared_amenities,
                (SELECT Hall_No FROM facility f WHERE f.Property_Id = p.APN LIMIT 1) as hall_no,
                (SELECT Kitchen_No FROM facility f WHERE f.Property_Id = p.APN LIMIT 1) as kitchen_no,
                (SELECT Bath_No FROM facility f WHERE f.Property_Id = p.APN LIMIT 1) as bath_no,
                (SELECT Bedroom_No FROM facility f WHERE f.Property_Id = p.APN LIMIT 1) as bedroom_no,
                (SELECT Price FROM Sell s WHERE s.Property_Id = p.APN LIMIT 1) as price,
                (SELECT Monthly_Rent FROM Rent r WHERE r.Property_Id = p.APN LIMIT 1) as rent
            FROM Property p WHERE p.APN = ${propertyIdInt}
        `;
       
        if (!current) return res.status(404).json({ message: 'Property not found' });

        // price or rent depending on Available_For
        let currentPrice = null;
        if (current.available_for) {
            const af = current.available_for.toLowerCase();
            if (af === 'sell') currentPrice = current.price;
            else if (af === 'rent') currentPrice = current.rent;
            else if (af === 'both') currentPrice = current.price != null ? current.price : current.rent;
        } else {
            // fallback: try price, then rent
            currentPrice = current.price != null ? current.price : current.rent;
        }
        
        const hall_no = current.hall_no != null ? parseInt(current.hall_no) : null;
        const kitchen_no = current.kitchen_no != null ? parseInt(current.kitchen_no) : null;
        const bath_no = current.bath_no != null ? parseInt(current.bath_no) : null;
        const bedroom_no = current.bedroom_no != null ? parseInt(current.bedroom_no) : null;
        const price = currentPrice != null ? parseInt(currentPrice) : null;
        console.log('DEBUG available_for:', current.available_for, 'currentPrice:', price);
        if (price == null) return res.status(400).json({ message: 'Current property missing price/rent' });

        // 2. Query for recommendations in SQL
        // The query will:
        // - Only consider properties in the same district (excluding the current property)
        // - Score based on:
        //   * +2 for each matching amenity (individual/shared)
        //   * +1 for each cross-type amenity match (individual vs shared)
        //   * +2 for each matching floor detail (hall, kitchen, bath, bedroom)
        //   * Price similarity: score = 2 - (abs(price difference) / currentPrice), min 0
        // - Return top 10 APNs

        const recommendations = await sql`
            WITH current AS (
                SELECT
                    ${current.district}::varchar AS district,
                    ${hall_no}::int AS hall_no,
                    ${kitchen_no}::int AS kitchen_no,
                    ${bath_no}::int AS bath_no,
                    ${bedroom_no}::int AS bedroom_no,
                    ${price}::bigint AS price,
                    coalesce(${current.ind_amenities}, ARRAY[]::varchar[]) AS ind_amenities,
                    coalesce(${current.shared_amenities}, ARRAY[]::varchar[]) AS shared_amenities
            )
            SELECT p.APN
            FROM Property p
            JOIN current c ON p.District = c.district AND p.APN != ${propertyIdInt}::bigint
            LEFT JOIN LATERAL (
                SELECT array_agg(ia.Amenity_name) AS ind_amenities
                FROM Individual_amenities ia WHERE ia.Property_Id = p.APN
            ) ind ON true
            LEFT JOIN LATERAL (
                SELECT array_agg(sa.Amenity_name) AS shared_amenities
                FROM Shared_amenities sa WHERE sa.Property_Id = p.APN
            ) shared ON true
            LEFT JOIN LATERAL (
                SELECT Hall_No, Kitchen_No, Bath_No, Bedroom_No
                FROM facility f WHERE f.Property_Id = p.APN LIMIT 1
            ) f ON true
            LEFT JOIN Sell s ON s.Property_Id = p.APN
            LEFT JOIN Rent r ON r.Property_Id = p.APN
            -- Compute scores
            CROSS JOIN LATERAL (
                -- Amenity matches (individual)
                SELECT
                    coalesce(array_length(array(SELECT unnest(coalesce(ind.ind_amenities, ARRAY[]::varchar[]))
                        INTERSECT SELECT unnest(c.ind_amenities)), 1), 0) AS ind_match,
                    coalesce(array_length(array(SELECT unnest(coalesce(shared.shared_amenities, ARRAY[]::varchar[]))
                        INTERSECT SELECT unnest(c.shared_amenities)), 1), 0) AS shared_match,
                    -- Cross-type matches
                    coalesce(array_length(array(SELECT unnest(coalesce(ind.ind_amenities, ARRAY[]::varchar[]))
                        INTERSECT SELECT unnest(c.shared_amenities)), 1), 0) AS ind_shared_cross,
                    coalesce(array_length(array(SELECT unnest(coalesce(shared.shared_amenities, ARRAY[]::varchar[]))
                        INTERSECT SELECT unnest(c.ind_amenities)), 1), 0) AS shared_ind_cross
            ) amenity_score
            -- Floor matches
            CROSS JOIN LATERAL (
                SELECT
                    (CASE WHEN f.Hall_No = c.hall_no AND f.Hall_No IS NOT NULL THEN 1 ELSE 0 END) AS hall_match,
                    (CASE WHEN f.Kitchen_No = c.kitchen_no AND f.Kitchen_No IS NOT NULL THEN 1 ELSE 0 END) AS kitchen_match,
                    (CASE WHEN f.Bath_No = c.bath_no AND f.Bath_No IS NOT NULL THEN 1 ELSE 0 END) AS bath_match,
                    (CASE WHEN f.Bedroom_No = c.bedroom_no AND f.Bedroom_No IS NOT NULL THEN 1 ELSE 0 END) AS bedroom_match
            ) floor_score
            -- Price similarity
            CROSS JOIN LATERAL (
                SELECT
                    COALESCE(s.Price, r.Monthly_Rent, 0) AS prop_price,
                    GREATEST(0, 2 - (ABS(COALESCE(s.Price, r.Monthly_Rent, 0) - c.price)::float / NULLIF(c.price,0))) AS price_score
            ) price_score
            -- Final score
            ORDER BY (
                (amenity_score.ind_match + amenity_score.shared_match) * 2
                + (amenity_score.ind_shared_cross + amenity_score.shared_ind_cross) * 1
                + (floor_score.hall_match + floor_score.kitchen_match + floor_score.bath_match + floor_score.bedroom_match) * 2
                + price_score.price_score
            ) DESC
            LIMIT 10;
        `;
        res.json(recommendations.map(r => r.apn));
    } catch (error) {
        console.error('Error in getRecommendations:', error);
        res.status(500).json({ message: 'Error getting recommendations' });
    }
}; 