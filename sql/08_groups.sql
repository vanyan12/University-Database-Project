USE uni

-- ALL GROUPS: BACHELOR'S & MAGISTRATURE


-- Faculty 1: Computer Science (CS)
INSERT INTO [Groups] ([group_id], [group_name], [study_year], [academic_year], [principal_std_id], [faculty_id]) VALUES 
(501, 'CS-1', 1, 2026, NULL, 1),
(502, 'CS-2', 2, 2026, NULL, 1),
(503, 'CS-3', 3, 2026, NULL, 1),
(504, 'CS-4', 4, 2026, NULL, 1),
(517, 'CS-1M', 1, 2026, NULL, 1), -- Magistrature
(518, 'CS-2M', 2, 2026, NULL, 1); -- Magistrature

-- Faculty 2: Law (L)
INSERT INTO [Groups] ([group_id], [group_name], [study_year], [academic_year], [principal_std_id], [faculty_id]) VALUES 
(505, 'L-1', 1, 2026, NULL, 2),
(506, 'L-2', 2, 2026, NULL, 2),
(507, 'L-3', 3, 2026, NULL, 2),
(508, 'L-4', 4, 2026, NULL, 2),
(519, 'L-1M', 1, 2026, NULL, 2), -- Magistrature
(520, 'L-2M', 2, 2026, NULL, 2); -- Magistrature

-- Faculty 3: Finance (F)
INSERT INTO [Groups] ([group_id], [group_name], [study_year], [academic_year], [principal_std_id], [faculty_id]) VALUES 
(509, 'F-1', 1, 2026, NULL, 3),
(510, 'F-2', 2, 2026, NULL, 3),
(511, 'F-3', 3, 2026, NULL, 3),
(512, 'F-4', 4, 2026, NULL, 3),
(521, 'F-1M', 1, 2026, NULL, 3), -- Magistrature
(522, 'F-2M', 2, 2026, NULL, 3); -- Magistrature

-- Faculty 4: Marketing (M)
INSERT INTO [Groups] ([group_id], [group_name], [study_year], [academic_year], [principal_std_id], [faculty_id]) VALUES 
(513, 'M-1', 1, 2026, NULL, 4),
(514, 'M-2', 2, 2026, NULL, 4),
(515, 'M-3', 3, 2026, NULL, 4),
(516, 'M-4', 4, 2026, NULL, 4),
(523, 'M-1M', 1, 2026, NULL, 4), -- Magistrature
(524, 'M-2M', 2, 2026, NULL, 4); -- Magistrature
GO