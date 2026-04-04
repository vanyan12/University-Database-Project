-- Drop database if it already exists (optional, for fresh setup)
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'uni')
BEGIN
    DROP DATABASE uni;
END
GO

-- Create the database
CREATE DATABASE uni;
GO

-- Use the database for all subsequent operations
USE uni;
GO