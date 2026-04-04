INSERT INTO [Enrollments] ([student_id], [course_id], [status], [final_grade])
SELECT 
    S.[student_id], 
    C.[course_id], 
    1, 
    CAST((RAND(CHECKSUM(NEWID())) * 2 + 2) AS DECIMAL(4,2))
FROM [Students] S
JOIN [Groups] G ON S.[group_id] = G.[group_id]
JOIN [Courses] C ON G.[faculty_id] = C.[faculty_id]
WHERE NOT EXISTS (
    SELECT 1 FROM [Enrollments] WHERE student_id = S.student_id AND course_id = C.course_id
);