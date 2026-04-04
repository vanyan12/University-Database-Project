USE uni;

-- COURSES (40 ROWS)
-- Faculty 1: Computer Science (Rows 201-210)
INSERT INTO [Courses] ([course_id], [course_name], [credits], [semester], [faculty_id]) VALUES 
(201, 'Introduction to C++', 6, 1, 1),
(202, 'Data Structures & Algorithms', 6, 2, 1),
(203, 'Discrete Mathematics', 5, 1, 1),
(204, 'Database Management Systems', 5, 2, 1),
(205, 'Operating Systems', 4, 1, 1),
(206, 'Object-Oriented Programming', 6, 2, 1),
(207, 'Computer Networks', 4, 1, 1),
(208, 'Artificial Intelligence', 6, 2, 1),
(209, 'Software Architecture', 5, 1, 1),
(210, 'Linear Algebra for CS', 4, 2, 1);

-- Faculty 2: Law (Rows 211-220)
INSERT INTO [Courses] ([course_id], [course_name], [credits], [semester], [faculty_id]) VALUES 
(211, 'Constitutional Law', 4, 1, 2),
(212, 'Criminal Procedure', 5, 1, 2),
(213, 'Civil Rights & Liberties', 4, 2, 2),
(214, 'International Public Law', 4, 2, 2),
(215, 'Roman Private Law', 3, 1, 2),
(216, 'Administrative Law', 5, 2, 2),
(217, 'Family Law', 3, 1, 2),
(218, 'Philosophy of Law', 2, 2, 2),
(219, 'Environmental Law', 4, 1, 2),
(220, 'Property Law', 5, 2, 2);

-- Faculty 3: Finance (Rows 221-230)
INSERT INTO [Courses] ([course_id], [course_name], [credits], [semester], [faculty_id]) VALUES 
(221, 'Microeconomics', 6, 1, 3),
(222, 'Macroeconomics', 6, 2, 3),
(223, 'Corporate Finance', 5, 1, 3),
(224, 'Investment Analysis', 5, 2, 3),
(225, 'Financial Accounting', 4, 1, 3),
(226, 'Risk Management', 4, 2, 3),
(227, 'Banking Operations', 4, 1, 3),
(228, 'Financial Econometrics', 5, 2, 3),
(229, 'Public Finance', 3, 1, 3),
(230, 'Taxation Law & Policy', 4, 2, 3);

-- Faculty 4: Marketing (Rows 231-240)
INSERT INTO [Courses] ([course_id], [course_name], [credits], [semester], [faculty_id]) VALUES 
(231, 'Principles of Marketing', 4, 1, 4),
(232, 'Consumer Behavior', 4, 1, 4),
(233, 'Digital Marketing Strategy', 5, 2, 4),
(234, 'Brand Management', 5, 2, 4),
(235, 'Market Research', 6, 1, 4),
(236, 'Advertising & Promotion', 4, 2, 4),
(237, 'Social Media Marketing', 3, 1, 4),
(238, 'Global Marketing', 4, 2, 4),
(239, 'Sales Management', 4, 1, 4),
(240, 'PR & Communications', 3, 2, 4);
GO