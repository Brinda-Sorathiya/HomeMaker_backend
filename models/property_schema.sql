-- Create ENUM types if they don't exist
DO $$ BEGIN
    CREATE TYPE property_status AS ENUM ('Available', 'Sold', 'Rented', 'Unavailable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE available_enum AS ENUM ('Rent', 'Sell', 'Both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE app_status AS ENUM ('Scheduled', 'Completed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pay_enum AS ENUM ('Online', 'Offline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sell_tran_status AS ENUM ('Successful', 'Failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cheque_status AS ENUM ('Bounced', 'Accepted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS Society(
    Society_reg_no VARCHAR(10) PRIMARY KEY,
    Society_name VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS Amenities(
    Amenity_name VARCHAR(30) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS Property (
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
    Society_reg_no VARCHAR(10) REFERENCES Society(Society_reg_no),
    Owner_id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT unique_constraint UNIQUE(State,City,District,Local_address,Pincode)
);

create table IF NOT EXISTS commission(
     Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE RESTRICT,
     Property_Id BIGINT REFERENCES Property(APN),
     Commission DECIMAL(3,2) NOT NULL,
     PRIMARY KEY (Agent_lc_no,Property_Id)
);
CREATE TABLE IF NOT EXISTS Individual_amenities(
    Property_Id BIGINT REFERENCES Property(APN),
    Amenity_name VARCHAR(255) REFERENCES Amenities(Amenity_name),
    PRIMARY KEY (Property_Id, Amenity_name)
);


CREATE TABLE IF NOT EXISTS Shared_amenities(
    Society_reg_no VARCHAR(10) REFERENCES Society(Society_reg_no),
    Amenity_name VARCHAR(255) REFERENCES Amenities(Amenity_name),
    PRIMARY KEY(Society_reg_no,Amenity_name)
);


-- Creating the Wishlist table
CREATE TABLE IF NOT EXISTS Wishlist (
    User_Id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (User_Id, Property_Id)
);


-- Create the Review table
CREATE TABLE IF NOT EXISTS Review (
    User_Id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
    Ratings DECIMAL(2,1) NOT NULL,
    Comments TEXT,
    PRIMARY KEY (User_Id, Property_Id)
);


-- Create the Inquiry table
CREATE TABLE IF NOT EXISTS Inquiry (
    date DATE NOT NULL,
    time TIME NOT NULL,
    User_Id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
    Inquiry TEXT NOT NULL,
    PRIMARY KEY (date,time, User_Id, Property_Id)
);


-- Create the Appointment table
CREATE TABLE IF NOT EXISTS Appointment (
    User_Id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
    Issue_date DATE NOT NULL,
    Issue_time TIME NOT NULL,
    Visit_date DATE NOT NULL,
    Visit_time TIME NOT NULL,
    Status app_status NOT NULL, 
    PRIMARY KEY (User_Id, Property_Id,Issue_date,Issue_time)
);


-- Create the Property_Image table
CREATE TABLE IF NOT EXISTS Property_Image (
    Image_Url TEXT PRIMARY KEY,
    Description TEXT,       
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT
);


-- Create the Rent table
CREATE TABLE IF NOT EXISTS Rent (
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
    Owner_id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY(Property_Id,Owner_id),
    Monthly_Rent INTEGER NOT NULL,
    Security_Deposit INTEGER NOT NULL,
    Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE SET NULL
);


-- Create the Sell table
CREATE TABLE IF NOT EXISTS Sell (
    Property_Id BIGINT REFERENCES Property(APN) ON UPDATE CASCADE ON DELETE RESTRICT,
    Owner_id CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY(Property_Id,Owner_id),
    Price BIGINT NOT NULL,
    Agent_lc_no BIGINT REFERENCES Agent(Licence_no) ON UPDATE CASCADE ON DELETE SET NULL
);


-- Create the Rent_Transaction table
CREATE TABLE IF NOT EXISTS Rent_transaction (
    Stamp_Paper_No VARCHAR NOT NULL,
    Pay_date DATE NOT NULL,
    Pay_time TIME NOT NULL,
    Property_Id BIGINT NOT NULL,
    Owner_id CHAR(10) NOT NULL,
    FOREIGN KEY (Property_Id,Owner_id) REFERENCES Rent(Property_Id,Owner_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Payment_Mode pay_enum NOT NULL,
    Amount_Paid INTEGER NOT NULL,
    Rented_By VARCHAR(255) NOT NULL REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY(Stamp_Paper_No,Pay_date,Pay_time)
);


CREATE TABLE IF NOT EXISTS Sell_Transaction (
    Stamp_Paper_No VARCHAR(255) NOT NULL,
    Pay_date DATE NOT NULL,
    Pay_time TIME NOT NULL,
    Status sell_tran_status NOT NULL,
    Property_Id BIGINT NOT NULL,
    Owner_id CHAR(10) NOT NULL,
    FOREIGN KEY (Property_Id,Owner_id) REFERENCES Sell(Property_Id,Owner_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    Amount_Paid INTEGER NOT NULL,
    Purchased_By CHAR(10) REFERENCES Users(User_Id) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (Stamp_Paper_No, Pay_date, Pay_time)
);


-- Create the RTGS_Transaction table
CREATE TABLE IF NOT EXISTS RTGS_Transaction (
    Transaction_Ref CHAR(22),
    Transfer_Date DATE NOT NULL,
    Receiver_Bank_Name VARCHAR(255) NOT NULL,
    Sender_Bank_Name VARCHAR(255) NOT NULL,
    Stamp_Paper_No VARCHAR(10) NOT NULL,
    Pay_date DATE NOT NULL,
    Pay_time TIME NOT NULL,
    PRIMARY KEY(Transaction_Ref),
    FOREIGN KEY (Stamp_paper_no, Pay_date, Pay_time) 
    REFERENCES Sell_Transaction(Stamp_paper_no, Pay_date, Pay_time) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT unique_constraint2 UNIQUE(Stamp_Paper_No,Pay_date,Pay_time)
);


-- Create the Cheque_Transaction table
CREATE TABLE IF NOT EXISTS Cheque_Transaction (
    Cheque_No INT PRIMARY KEY,
    Issue_Date DATE NOT NULL,
    Status cheque_status NOT NULL,
    Bank_Name VARCHAR(255) NOT NULL,
    Stamp_Paper_No VARCHAR(10) NOT NULL,
    Pay_date DATE NOT NULL,
    Pay_time TIME NOT NULL,
    FOREIGN KEY (Stamp_paper_no, Pay_date, Pay_time) 
    REFERENCES Sell_Transaction(Stamp_paper_no, Pay_date, Pay_time) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT unique_constraint3 UNIQUE(Stamp_Paper_No,Pay_date,Pay_time)
);


-- Create the DD_Transaction table
CREATE TABLE IF NOT EXISTS DD_Transaction (
    DD_No INTEGER PRIMARY KEY,
    Stamp_Paper_No VARCHAR(10) NOT NULL,
    Pay_date DATE NOT NULL,
    Pay_time TIME NOT NULL,
    Issue_Date DATE NOT NULL,
    Bank_Name VARCHAR(255) NOT NULL,
    FOREIGN KEY (Stamp_paper_no, Pay_date, Pay_time) 
    REFERENCES Sell_Transaction(Stamp_paper_no, Pay_date, Pay_time) ON UPDATE CASCADE ON DELETE CASCADE
);


-- Create the Cash_Transaction table
CREATE TABLE IF NOT EXISTS Cash_Transaction (
    Stamp_Paper_No VARCHAR(10),
    Pay_Date DATE NOT NULL,
    Pay_Time TIME NOT NULL,
    Received_By VARCHAR(10) NOT NULL,
    PRIMARY KEY(Stamp_paper_no, Pay_date, Pay_time),
    FOREIGN KEY (Stamp_paper_no, Pay_date, Pay_time) 
    REFERENCES Sell_Transaction(Stamp_paper_no, Pay_date, Pay_time) ON UPDATE CASCADE ON DELETE CASCADE
);