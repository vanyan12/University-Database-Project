-- This script populates the Student_Assignments table for all existing students.
-- It only creates entries for assignments that belong to courses the student is enrolled in.

INSERT INTO [Student_Assignments] ([student_id], [assignment_id], [grade], [submission_date])
SELECT 
    E.[student_id], 
    A.[assignment_id],
    -- Generates a random grade based on the assignment's max_grade
    CAST((RAND(CHECKSUM(NEWID(), E.student_id, A.assignment_id)) * (A.max_grade - (A.max_grade * 0.4)) + (A.max_grade * 0.4)) AS DECIMAL(5,2)) as grade,
    -- Generates a random submission date near the due date
    DATEADD(day, -RAND(CHECKSUM(NEWID())) * 5, A.due_date) as submission_date
FROM [Enrollments] E
JOIN [Assignments] A ON E.[course_id] = A.[course_id]
WHERE NOT EXISTS (
    SELECT 1 FROM [Student_Assignments] SA 
    WHERE SA.student_id = E.student_id AND SA.assignment_id = A.assignment_id
);
GO