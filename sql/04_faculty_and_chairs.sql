USE uni;

INSERT INTO [Faculty] ([faculty_id], [faculty_name], [dean_prof_id]) VALUES 
(1, 'Computer Science', 101),
(2, 'Law', 102),
(3, 'Finance', 103),
(4, 'Marketing', 104);

INSERT INTO [Chairs] ([chair_id], [chair_name], [head_prof_id], [faculty_id]) VALUES 
(1, 'French Language', 105, 4), -- Head: Vahan Martirosyan [cite: 167, 239, 243]
(2, 'English Language', 106, 4), -- Head: Lilit Hakobyan [cite: 167, 239, 243]
(3, 'Programming Languages', 101, 1), -- Head: Armen Vardanyan [cite: 167, 239, 243]
(4, 'Math', 102, 1), -- Head: Gayane Melikyan [cite: 167, 239, 243]
(5, 'Criminal Law', 103, 2), -- Head: Suren Petrosyan [cite: 167, 239, 243]
(6, 'Civil Law', 110, 2), -- Head: Ani Mnatsakanyan [cite: 167, 239, 243]
(7, 'Corporate Finance', 104, 3), -- Head: Anahit Sargsyan [cite: 167, 239, 243]
(8, 'Digital Marketing', 107, 4); -- Head: Tigran Avagyan [cite: 167, 239, 243]
GO