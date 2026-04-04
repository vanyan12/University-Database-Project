USE uni;

-- Update professors.chair_id after chairs are inserted
UPDATE [Professors] SET [chair_id] = 3 WHERE [professor_id] IN (101, 108, 115, 121, 128, 135);
-- Math
UPDATE [Professors] SET [chair_id] = 4 WHERE [professor_id] IN (102, 109, 116, 122, 129, 136);
-- Criminal Law
UPDATE [Professors] SET [chair_id] = 5 WHERE [professor_id] IN (103, 111, 123, 131);
-- Civil Law
UPDATE [Professors] SET [chair_id] = 6 WHERE [professor_id] IN (110, 118, 130, 138);
-- Corporate Finance
UPDATE [Professors] SET [chair_id] = 7 WHERE [professor_id] IN (104, 112, 119, 124, 132, 139);
-- Digital Marketing
UPDATE [Professors] SET [chair_id] = 8 WHERE [professor_id] IN (107, 114, 120, 127, 134);
-- French
UPDATE [Professors] SET [chair_id] = 1 WHERE [professor_id] IN (105, 117, 126, 137);
-- English
UPDATE [Professors] SET [chair_id] = 2 WHERE [professor_id] IN (106, 113, 125, 133, 140);

GO